import uuid

import pytest
from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.models import User

PASSWORD = "Secreta123!"


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def test_email():
    email = f"test_{uuid.uuid4().hex[:12]}@example.com"
    yield email
    # Limpieza: borra el usuario de prueba aunque el test falle.
    with SessionLocal() as db:
        db.query(User).filter(User.email == email).delete()
        db.commit()


def register(client, email, password=PASSWORD):
    return client.post(
        "/auth/register", json={"name": "Usuario Test", "email": email, "password": password}
    )


def login(client, email, password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_login_and_me(client, test_email):
    res = register(client, test_email)
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == test_email
    assert body["role"] == "user"
    assert body["currency"] == "BOB"
    assert "password_hash" not in body and "password" not in body

    res = login(client, test_email)
    assert res.status_code == 200
    tokens = res.json()
    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"] and tokens["refresh_token"]

    res = client.get("/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert res.status_code == 200
    assert res.json()["email"] == test_email
    assert "password_hash" not in res.json()


def test_register_duplicate_email_returns_409(client, test_email):
    assert register(client, test_email).status_code == 201
    assert register(client, test_email.upper()).status_code == 409


def test_register_short_password_returns_422(client, test_email):
    assert register(client, test_email, password="corta").status_code == 422


def test_login_wrong_password_returns_401(client, test_email):
    register(client, test_email)

    res = login(client, test_email, password="incorrecta123")
    assert res.status_code == 401


def test_me_without_token_returns_401(client):
    assert client.get("/users/me").status_code == 401


def test_refresh_token_cannot_access_me(client, test_email):
    register(client, test_email)
    tokens = login(client, test_email).json()

    res = client.get("/users/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert res.status_code == 401


def test_refresh_returns_new_access_token(client, test_email):
    register(client, test_email)
    tokens = login(client, test_email).json()

    res = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert res.status_code == 200
    new_access = res.json()["access_token"]
    assert client.get("/users/me", headers={"Authorization": f"Bearer {new_access}"}).status_code == 200

    # Un access token no sirve como refresh token.
    res = client.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert res.status_code == 401


def test_change_password(client, test_email):
    register(client, test_email)
    access = login(client, test_email).json()["access_token"]
    headers = {"Authorization": f"Bearer {access}"}

    res = client.post(
        "/auth/change-password",
        json={"current_password": "incorrecta123", "new_password": "NuevaClave456!"},
        headers=headers,
    )
    assert res.status_code == 400

    res = client.post(
        "/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "NuevaClave456!"},
        headers=headers,
    )
    assert res.status_code == 204
    assert login(client, test_email).status_code == 401
    assert login(client, test_email, password="NuevaClave456!").status_code == 200
