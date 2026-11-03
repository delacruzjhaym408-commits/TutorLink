from tests.helpers import application_payload, booking_payload, create_user, next_weekday, subject_id


def test_subjects_and_tutors_require_login(client):
    assert client.get("/subjects").status_code == 401
    assert client.get("/tutors").status_code == 401


def test_student_cannot_use_admin_endpoints(client):
    headers = create_user(client, "student@test.com")
    for path in ("/admin/users", "/admin/stats", "/admin/applications"):
        assert client.get(path, headers=headers).status_code == 403


def test_admin_can_list_users(client, admin_headers):
    create_user(client, "student@test.com")
    response = client.get("/admin/users", headers=admin_headers)
    assert response.status_code == 200
    emails = {user["email"] for user in response.json()}
    assert {"admin@test.com", "student@test.com"} <= emails


def test_admin_cannot_apply_as_tutor(client, db, admin_headers):
    payload = application_payload([subject_id(db, "Programming")])
    assert client.post("/tutor-applications", json=payload, headers=admin_headers).status_code == 403


def test_admin_cannot_book(client, db, tutor, admin_headers):
    payload = booking_payload(tutor["profile_id"], subject_id(db, "Programming"), next_weekday(1))
    assert client.post("/bookings", json=payload, headers=admin_headers).status_code == 403


def test_parent_cannot_apply_as_tutor(client, db, parent_headers):
    payload = application_payload([subject_id(db, "Programming")])
    assert client.post("/tutor-applications", json=payload, headers=parent_headers).status_code == 403


def test_student_who_is_not_a_tutor_cannot_use_tutor_endpoints(client):
    headers = create_user(client, "student@test.com")
    assert client.get("/tutor-profile/me", headers=headers).status_code == 403
    assert client.get("/bookings/incoming", headers=headers).status_code == 403