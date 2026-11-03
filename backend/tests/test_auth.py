from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings
from app.models import User
from tests.helpers import PASSWORD, create_user, register


def test_register_student_success(client):
    response = register(client, "student@test.com")
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "student@test.com"
    assert body["role"] == "student"
    assert body["is_approved_tutor"] is False
    assert "password" not in body
    assert "password_hash" not in body


def test_register_parent_success(client):
    response = register(client, "parent@test.com", role="parent")
    assert response.status_code == 201
    assert response.json()["role"] == "parent"


def test_register_duplicate_email_returns_409(client):
    assert register(client, "dup@test.com").status_code == 201
    response = register(client, "dup@test.com")
    assert response.status_code == 409
    assert response.json()["detail"] == "An account with this email already exists"


def test_email_is_not_case_sensitive(client):
    assert register(client, "Case@Test.com").status_code == 201
    assert register(client, "case@test.com").status_code == 409


def test_register_cannot_choose_admin_role(client):
    response = register(client, "hacker@test.com", role="admin")
    assert response.status_code == 422


def test_register_rejects_short_password(client):
    assert register(client, "short@test.com", password="abc").status_code == 422


def test_register_rejects_invalid_email(client):
    assert register(client, "not-an-email").status_code == 422


def test_login_returns_token_and_user(client):
    register(client, "login@test.com")
    response = client.post("/auth/login", data={"username": "login@test.com", "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "login@test.com"


def test_login_wrong_password_returns_401(client):
    register(client, "login@test.com")
    response = client.post("/auth/login", data={"username": "login@test.com", "password": "WrongPass1"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_unknown_email_returns_the_same_401(client):
    response = client.post("/auth/login", data={"username": "nobody@test.com", "password": PASSWORD})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_disabled_account_cannot_log_in(client, db):
    register(client, "off@test.com")
    user = db.query(User).filter(User.email == "off@test.com").one()
    user.is_active = False
    db.commit()
    response = client.post("/auth/login", data={"username": "off@test.com", "password": PASSWORD})
    assert response.status_code == 403
    assert response.json()["detail"] == "This account is disabled"


def test_me_requires_token(client):
    assert client.get("/users/me").status_code == 401


def test_me_returns_current_user(client):
    headers = create_user(client, "me@test.com", full_name="Me Test")
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Me Test"


def test_invalid_token_returns_401(client):
    response = client.get("/users/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_expired_token_returns_401(client):
    user = register(client, "old@test.com").json()
    token = jwt.encode(
        {"sub": str(user["id"]), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_password_is_stored_hashed(client, db):
    register(client, "hash@test.com")
    user = db.query(User).filter(User.email == "hash@test.com").one()
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$2")