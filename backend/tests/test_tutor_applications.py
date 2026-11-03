import pytest

from tests.helpers import application_payload, create_approved_tutor, create_user, subject_id


def apply(client, db, headers, **kwargs):
    payload = application_payload([subject_id(db, "Programming")], **kwargs)
    return client.post("/tutor-applications", json=payload, headers=headers)


def test_student_can_apply_and_status_is_pending(client, db):
    headers = create_user(client, "student@test.com")
    response = apply(client, db, headers)
    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["hourly_rate"] == 300

    mine = client.get("/tutor-applications/me", headers=headers)
    assert mine.status_code == 200
    assert mine.json()["status"] == "pending"


def test_no_application_returns_null(client):
    headers = create_user(client, "student@test.com")
    response = client.get("/tutor-applications/me", headers=headers)
    assert response.status_code == 200
    assert response.json() is None


def test_second_application_while_pending_returns_409(client, db):
    headers = create_user(client, "student@test.com")
    assert apply(client, db, headers).status_code == 201
    response = apply(client, db, headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "You already have an application waiting for review"


def test_pending_applicant_is_not_listed(client, db):
    headers = create_user(client, "student@test.com")
    apply(client, db, headers)
    other = create_user(client, "other@test.com")
    assert client.get("/tutors", headers=other).json() == []


def test_admin_approval_makes_the_tutor_visible(client, db, admin_headers):
    headers = create_user(client, "student@test.com", full_name="Applicant")
    application_id = apply(client, db, headers).json()["id"]

    approval = client.post(f"/admin/applications/{application_id}/approve", headers=admin_headers)
    assert approval.status_code == 200
    assert approval.json()["status"] == "approved"

    tutors = client.get("/tutors", headers=headers).json()
    assert len(tutors) == 1
    assert tutors[0]["full_name"] == "Applicant"

    me = client.get("/users/me", headers=headers).json()
    assert me["is_approved_tutor"] is True
    assert me["role"] == "student"  # the same account, no second account


def test_approved_tutor_cannot_apply_again(client, db, admin_headers, tutor):
    response = apply(client, db, tutor["headers"])
    assert response.status_code == 409
    assert response.json()["detail"] == "You are already a tutor"


def test_rejection_requires_remarks(client, db, admin_headers):
    headers = create_user(client, "student@test.com")
    application_id = apply(client, db, headers).json()["id"]
    url = f"/admin/applications/{application_id}/reject"

    assert client.post(url, json={"remarks": ""}, headers=admin_headers).status_code == 422

    response = client.post(url, json={"remarks": "Please add more details."}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"

    mine = client.get("/tutor-applications/me", headers=headers).json()
    assert mine["status"] == "rejected"
    assert mine["admin_remarks"] == "Please add more details."


def test_rejected_applicant_can_apply_again_and_is_not_listed(client, db, admin_headers):
    headers = create_user(client, "student@test.com")
    first_id = apply(client, db, headers).json()["id"]
    client.post(
        f"/admin/applications/{first_id}/reject", json={"remarks": "Not enough details."}, headers=admin_headers
    )

    second = apply(client, db, headers)
    assert second.status_code == 201
    assert second.json()["status"] == "pending"
    assert client.get("/tutors", headers=headers).json() == []


def test_reviewed_application_cannot_be_reviewed_again(client, db, admin_headers):
    headers = create_user(client, "student@test.com")
    application_id = apply(client, db, headers).json()["id"]

    assert client.post(f"/admin/applications/{application_id}/approve", headers=admin_headers).status_code == 200

    again = client.post(f"/admin/applications/{application_id}/approve", headers=admin_headers)
    assert again.status_code == 409
    assert again.json()["detail"] == "This application has already been reviewed"

    reject = client.post(
        f"/admin/applications/{application_id}/reject", json={"remarks": "Too late."}, headers=admin_headers
    )
    assert reject.status_code == 409


@pytest.mark.parametrize(
    "change",
    [
        {"hourly_rate": 20},
        {"subject_ids": []},
        {"subject_ids": [999999]},
        {"availability": []},
        {"qualifications": "short"},
        {"availability": [{"day_of_week": "tuesday", "start_time": "20:00:00", "end_time": "18:00:00"}]},
        {
            "availability": [
                {"day_of_week": "tuesday", "start_time": "18:00:00", "end_time": "20:00:00"},
                {"day_of_week": "tuesday", "start_time": "19:00:00", "end_time": "21:00:00"},
            ]
        },
    ],
)
def test_invalid_application_data_returns_422(client, db, change):
    headers = create_user(client, "student@test.com")
    payload = application_payload([subject_id(db, "Programming")])
    payload.update(change)
    assert client.post("/tutor-applications", json=payload, headers=headers).status_code == 422


def test_approved_tutor_can_edit_the_profile(client, db, tutor):
    payload = application_payload([subject_id(db, "Programming")], rate=350)
    response = client.put("/tutor-profile/me", json=payload, headers=tutor["headers"])
    assert response.status_code == 200
    assert response.json()["hourly_rate"] == 350

    listed = client.get("/tutors", headers=tutor["headers"]).json()
    assert listed[0]["hourly_rate"] == 350