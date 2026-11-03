from datetime import date, timedelta

from app.models import Subject, User, UserRole
from app.security import hash_password

PASSWORD = "Password123"


def register(client, email, role="student", password=PASSWORD, full_name="Test User"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name, "role": role},
    )


def auth_headers(client, email, password=PASSWORD):
    response = client.post("/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_user(client, email, role="student", full_name="Test User"):
    response = register(client, email, role=role, full_name=full_name)
    assert response.status_code == 201, response.text
    return auth_headers(client, email)


def create_admin(client, db, email="admin@test.com"):
    db.add(
        User(
            email=email,
            password_hash=hash_password(PASSWORD),
            full_name="Admin Test",
            role=UserRole.admin,
        )
    )
    db.commit()
    return auth_headers(client, email)


def subject_id(db, name):
    return db.query(Subject).filter(Subject.name == name).one().id


def next_weekday(weekday, min_days_ahead=2):
    """Returns a future date on the given weekday (Monday = 0 ... Sunday = 6)."""
    value = date.today() + timedelta(days=min_days_ahead)
    while value.weekday() != weekday:
        value += timedelta(days=1)
    return value


def application_payload(subject_ids, rate=300, slots=None):
    if slots is None:
        slots = [{"day_of_week": "tuesday", "start_time": "18:00:00", "end_time": "20:00:00"}]
    return {
        "qualifications": "3rd year BS Information Technology; Dean's Lister",
        "bio": "I enjoy teaching programming.",
        "hourly_rate": rate,
        "subject_ids": subject_ids,
        "availability": slots,
    }


def create_approved_tutor(
    client, db, admin_headers, email="tutor@test.com", subjects=("Programming", "Mathematics")
):
    """Registers a student, applies as a tutor, and has the admin approve the application."""
    headers = create_user(client, email, full_name="Tutor Test")
    payload = application_payload([subject_id(db, name) for name in subjects])

    response = client.post("/tutor-applications", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    application_id = response.json()["id"]

    approval = client.post(
        f"/admin/applications/{application_id}/approve", headers=admin_headers
    )
    assert approval.status_code == 200, approval.text

    profile = client.get("/tutor-profile/me", headers=headers)
    assert profile.status_code == 200, profile.text
    return {"headers": headers, "profile_id": profile.json()["id"], "email": email}


def booking_payload(tutor_profile_id, subject, session_date, start="18:00:00", end="19:00:00"):
    return {
        "tutor_profile_id": tutor_profile_id,
        "subject_id": subject,
        "session_date": session_date.isoformat(),
        "start_time": start,
        "end_time": end,
        "notes": "Need help.",
    }