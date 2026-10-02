"""Cuentas, categorías y métodos de pago. Requiere la migración y el seed aplicados."""
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
def make_user(client):
    """Crea usuarios de prueba y devuelve sus headers de autorización."""
    emails: list[str] = []

    def _make() -> dict[str, str]:
        email = f"test_{uuid.uuid4().hex[:12]}@example.com"
        emails.append(email)
        client.post("/auth/register", json={"name": "Test", "email": email, "password": PASSWORD})
        token = client.post("/auth/login", json={"email": email, "password": PASSWORD}).json()
        return {"Authorization": f"Bearer {token['access_token']}"}

    yield _make
    # ON DELETE CASCADE borra también sus cuentas, categorías y métodos.
    with SessionLocal() as db:
        db.query(User).filter(User.email.in_(emails)).delete(synchronize_session=False)
        db.commit()


def test_endpoints_require_auth(client):
    for path in ("/accounts", "/categories", "/payment-methods"):
        assert client.get(path).status_code == 401


# --- Cuentas -----------------------------------------------------------------

def test_account_crud(client, make_user):
    headers = make_user()

    res = client.post(
        "/accounts",
        json={"name": "Banco Unión", "type": "cuenta_bancaria", "initial_balance": "1500.50"},
        headers=headers,
    )
    assert res.status_code == 201
    account = res.json()
    assert account["balance"] == account["initial_balance"] == "1500.50"
    assert account["currency"] == "BOB"

    assert [a["id"] for a in client.get("/accounts", headers=headers).json()] == [account["id"]]

    res = client.put(
        f"/accounts/{account['id']}",
        json={"name": "Banco Unión - Ahorros", "initial_balance": "2000.50"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Banco Unión - Ahorros"
    assert res.json()["balance"] == "2000.50"

    assert client.delete(f"/accounts/{account['id']}", headers=headers).status_code == 204
    assert client.get(f"/accounts/{account['id']}", headers=headers).status_code == 404


def test_account_validation(client, make_user):
    headers = make_user()

    bad_type = {"name": "X", "type": "criptomonedas"}
    too_many_decimals = {"name": "X", "type": "efectivo", "initial_balance": "10.999"}
    blank_name = {"name": "   ", "type": "efectivo"}
    for body in (bad_type, too_many_decimals, blank_name):
        assert client.post("/accounts", json=body, headers=headers).status_code == 422


def test_cannot_access_other_users_account(client, make_user):
    owner, intruder = make_user(), make_user()
    account_id = client.post(
        "/accounts", json={"name": "Mía", "type": "efectivo"}, headers=owner
    ).json()["id"]

    assert client.get(f"/accounts/{account_id}", headers=intruder).status_code == 404
    assert (
        client.put(f"/accounts/{account_id}", json={"name": "Robada"}, headers=intruder).status_code
        == 404
    )
    assert client.delete(f"/accounts/{account_id}", headers=intruder).status_code == 404
    assert client.get("/accounts", headers=intruder).json() == []


# --- Categorías --------------------------------------------------------------

def test_list_categories_includes_system_and_filters_by_type(client, make_user):
    headers = make_user()

    categories = client.get("/categories", headers=headers).json()
    names = {c["name"] for c in categories if c["is_system"]}
    assert {"Alimentación", "Transporte", "Salario", "Ventas"} <= names

    expenses = client.get("/categories?type=gasto", headers=headers).json()
    assert expenses and all(c["type"] == "gasto" for c in expenses)
    assert client.get("/categories?type=otro", headers=headers).status_code == 422


def test_category_crud_and_isolation(client, make_user):
    owner, other = make_user(), make_user()

    res = client.post(
        "/categories", json={"name": "Mascotas", "icon": "paw", "type": "gasto"}, headers=owner
    )
    assert res.status_code == 201
    category = res.json()
    assert category["is_system"] is False and category["is_default"] is False

    # Visible solo para su dueño.
    assert any(c["id"] == category["id"] for c in client.get("/categories", headers=owner).json())
    assert all(c["id"] != category["id"] for c in client.get("/categories", headers=other).json())

    # Otro usuario no puede tocarla (404, no revela que existe).
    assert (
        client.put(f"/categories/{category['id']}", json={"name": "X"}, headers=other).status_code
        == 404
    )
    assert client.delete(f"/categories/{category['id']}", headers=other).status_code == 404

    res = client.put(f"/categories/{category['id']}", json={"icon": "dog"}, headers=owner)
    assert res.status_code == 200 and res.json()["icon"] == "dog"
    assert client.delete(f"/categories/{category['id']}", headers=owner).status_code == 204


def test_system_category_is_read_only(client, make_user):
    headers = make_user()
    system = next(c for c in client.get("/categories", headers=headers).json() if c["is_system"])

    assert (
        client.put(f"/categories/{system['id']}", json={"name": "X"}, headers=headers).status_code
        == 403
    )
    assert client.delete(f"/categories/{system['id']}", headers=headers).status_code == 403


def test_duplicate_category_name_returns_409(client, make_user):
    headers = make_user()
    # Choca con la categoría del sistema "Alimentación" (sin distinguir mayúsculas).
    res = client.post(
        "/categories", json={"name": "alimentación", "type": "gasto"}, headers=headers
    )
    assert res.status_code == 409


# --- Métodos de pago ---------------------------------------------------------

def test_payment_methods(client, make_user):
    owner, other = make_user(), make_user()

    methods = client.get("/payment-methods", headers=owner).json()
    system = [m for m in methods if m["is_system"]]
    assert {"Efectivo", "Tarjeta", "Transferencia", "QR", "Billetera digital"} <= {
        m["name"] for m in system
    }

    res = client.post("/payment-methods", json={"name": "Tigo Money", "type": "billetera_digital"}, headers=owner)
    assert res.status_code == 201
    method_id = res.json()["id"]

    assert client.put(f"/payment-methods/{system[0]['id']}", json={"name": "X"}, headers=owner).status_code == 403
    assert client.delete(f"/payment-methods/{method_id}", headers=other).status_code == 404
    assert client.delete(f"/payment-methods/{method_id}", headers=owner).status_code == 204
