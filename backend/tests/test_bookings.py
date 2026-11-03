from datetime import date

import pytest

from app.models import Booking
from tests.helpers import (
    booking_payload,
    create_approved_tutor,
    create_user,
    next_weekday,
    subject_id,
)

TUESDAY = 1  # the test tutor is available on Tuesdays from 18:00 to 20:00
WEDNESDAY = 2


@pytest.fixture()
def tuesday():
    return next_weekday(TUESDAY)


def book(client, db, tutor, headers, day, start="18:00:00", end="19:00:00", subject="Programming"):
    payload = booking_payload(tutor["profile_id"], subject_id(db, subject), day, start, end)
    return client.post("/bookings", json=payload, headers=headers)


# ---------- Creating bookings ----------
def test_parent_can_create_a_pending_booking(client, db, tutor, parent_headers, tuesday):
    response = book(client, db, tutor, parent_headers, tuesday)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["tutor_name"] == "Tutor Test"
    assert body["subject_name"] == "Programming"


def test_duplicate_booking_returns_409(client, db, tutor, parent_headers, tuesday):
    assert book(client, db, tutor, parent_headers, tuesday).status_code == 201
    response = book(client, db, tutor, parent_headers, tuesday)
    assert response.status_code == 409
    assert response.json()["detail"] == "You already have an overlapping booking at this time"


def test_tutor_cannot_book_themselves(client, db, tutor, tuesday):
    assert book(client, db, tutor, tutor["headers"], tuesday).status_code == 400


def test_unknown_tutor_returns_404(client, db, parent_headers, tuesday):
    payload = booking_payload(999999, subject_id(db, "Programming"), tuesday)
    assert client.post("/bookings", json=payload, headers=parent_headers).status_code == 404


def test_booking_on_an_unavailable_day_returns_422(client, db, tutor, parent_headers):
    response = book(client, db, tutor, parent_headers, next_weekday(WEDNESDAY))
    assert response.status_code == 422
    assert response.json()["detail"] == "The date and time are outside the tutor's availability"


def test_booking_outside_the_available_hours_returns_422(client, db, tutor, parent_headers, tuesday):
    response = book(client, db, tutor, parent_headers, tuesday, start="20:30:00", end="21:30:00")
    assert response.status_code == 422


def test_booking_a_subject_the_tutor_does_not_teach_returns_422(client, db, tutor, parent_headers, tuesday):
    response = book(client, db, tutor, parent_headers, tuesday, subject="English")
    assert response.status_code == 422
    assert response.json()["detail"] == "This tutor does not teach that subject"


def test_booking_in_the_past_returns_422(client, db, tutor, parent_headers):
    response = book(client, db, tutor, parent_headers, date(2020, 1, 7))
    assert response.status_code == 422


def test_booking_shorter_than_30_minutes_returns_422(client, db, tutor, parent_headers, tuesday):
    response = book(client, db, tutor, parent_headers, tuesday, start="18:00:00", end="18:15:00")
    assert response.status_code == 422


def test_booking_with_end_before_start_returns_422(client, db, tutor, parent_headers, tuesday):
    response = book(client, db, tutor, parent_headers, tuesday, start="19:00:00", end="18:00:00")
    assert response.status_code == 422


# ---------- Lists ----------
def test_bookings_me_lists_only_own_bookings(client, db, tutor, parent_headers, tuesday):
    book(client, db, tutor, parent_headers, tuesday)
    other = create_user(client, "other@test.com")

    assert len(client.get("/bookings/me", headers=parent_headers).json()) == 1
    assert client.get("/bookings/me", headers=other).json() == []


def test_tutor_sees_the_incoming_booking(client, db, tutor, parent_headers, tuesday):
    book(client, db, tutor, parent_headers, tuesday)
    response = client.get("/bookings/incoming", headers=tutor["headers"])
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["student_name"] == "Parent Test"
    assert items[0]["status"] == "pending"


# ---------- Accept, reject ----------
def test_tutor_accepts_a_pending_booking_only_once(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    url = f"/bookings/{booking_id}/accept"

    accepted = client.post(url, headers=tutor["headers"])
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"

    again = client.post(url, headers=tutor["headers"])
    assert again.status_code == 409
    assert again.json()["detail"] == "Only pending bookings can be accepted"


def test_tutor_rejects_a_pending_booking_only_once(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    url = f"/bookings/{booking_id}/reject"

    assert client.post(url, headers=tutor["headers"]).json()["status"] == "rejected"
    assert client.post(url, headers=tutor["headers"]).status_code == 409


def test_overlapping_booking_with_an_accepted_session_returns_409(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    client.post(f"/bookings/{booking_id}/accept", headers=tutor["headers"])

    other = create_user(client, "other@test.com", full_name="Other User")
    overlapping = book(client, db, tutor, other, tuesday, start="18:30:00", end="19:30:00")
    assert overlapping.status_code == 409
    assert overlapping.json()["detail"] == "The tutor already has another session at this time"

    # A session that starts exactly when the other one ends is allowed
    back_to_back = book(client, db, tutor, other, tuesday, start="19:00:00", end="20:00:00")
    assert back_to_back.status_code == 201


def test_another_tutor_cannot_change_the_booking(client, db, admin_headers, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    second_tutor = create_approved_tutor(client, db, admin_headers, email="tutor2@test.com")

    response = client.post(f"/bookings/{booking_id}/accept", headers=second_tutor["headers"])
    assert response.status_code == 404


# ---------- Cancel ----------
def test_booker_can_cancel_their_booking(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    url = f"/bookings/{booking_id}/cancel"

    cancelled = client.post(url, headers=parent_headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    again = client.post(url, headers=parent_headers)
    assert again.status_code == 409


def test_another_user_cannot_cancel_the_booking(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    other = create_user(client, "other@test.com")
    assert client.post(f"/bookings/{booking_id}/cancel", headers=other).status_code == 404


def test_cancelling_frees_the_time_slot(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    client.post(f"/bookings/{booking_id}/accept", headers=tutor["headers"])
    client.post(f"/bookings/{booking_id}/cancel", headers=parent_headers)

    other = create_user(client, "other@test.com")
    assert book(client, db, tutor, other, tuesday).status_code == 201


# ---------- Complete ----------
def test_pending_booking_cannot_be_completed(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    response = client.post(f"/bookings/{booking_id}/complete", headers=tutor["headers"])
    assert response.status_code == 409


def test_future_session_cannot_be_completed(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    client.post(f"/bookings/{booking_id}/accept", headers=tutor["headers"])

    response = client.post(f"/bookings/{booking_id}/complete", headers=tutor["headers"])
    assert response.status_code == 409
    assert response.json()["detail"] == "The date of this session has not arrived yet"


def test_session_can_be_completed_on_the_session_day(client, db, tutor, parent_headers, tuesday):
    booking_id = book(client, db, tutor, parent_headers, tuesday).json()["id"]
    client.post(f"/bookings/{booking_id}/accept", headers=tutor["headers"])

    # Pretend the session day has arrived
    db.query(Booking).filter(Booking.id == booking_id).update({"session_date": date.today()})
    db.commit()

    response = client.post(f"/bookings/{booking_id}/complete", headers=tutor["headers"])
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


# ---------- Admin numbers ----------
def test_admin_stats_count_everything(client, db, admin_headers, tutor, parent_headers, tuesday):
    book(client, db, tutor, parent_headers, tuesday)
    stats = client.get("/admin/stats", headers=admin_headers).json()
    assert stats["total_users"] == 3
    assert stats["approved_tutors"] == 1
    assert stats["pending_applications"] == 0
    assert stats["total_bookings"] == 1