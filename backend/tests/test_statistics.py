"""Resumen del dashboard (GET /statistics/summary)."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.models import User
from app.services.statistics_service import current_month

PASSWORD = "Secreta123!"
MONTH = "2026-09"


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_user(client):
    """Crea usuarios de prueba y devuelve sus headers; los borra al terminar."""
    emails: list[str] = []

    def _make() -> dict[str, str]:
        email = f"test_{uuid.uuid4().hex[:12]}@example.com"
        emails.append(email)
        client.post("/auth/register", json={"name": "Test", "email": email, "password": PASSWORD})
        token = client.post("/auth/login", json={"email": email, "password": PASSWORD}).json()
        return {"Authorization": f"Bearer {token['access_token']}"}

    yield _make
    # ON DELETE CASCADE elimina también sus cuentas y movimientos.
    with SessionLocal() as db:
        db.query(User).filter(User.email.in_(emails)).delete(synchronize_session=False)
        db.commit()


@pytest.fixture
def category_ids(client, make_user):
    categories = client.get("/categories", headers=make_user()).json()
    by_name = {c["name"]: c["id"] for c in categories if c["is_system"]}
    return {"GASTO": by_name["Alimentación"], "INGRESO": by_name["Salario"]}


def create_account(client, headers, initial):
    res = client.post(
        "/accounts", json={"name": "Cuenta", "type": "efectivo", "initial_balance": initial},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["id"]


def create_tx(client, headers, account_id, category_ids, type_, amount, date):
    res = client.post(
        "/transactions",
        json={
            "account_id": account_id,
            "category_id": category_ids[type_],
            "type": type_,
            "amount": amount,
            "date": date,
        },
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()


def summary(client, headers, month=None):
    params = {"month": month} if month else None
    return client.get("/statistics/summary", params=params, headers=headers)


def test_requires_auth(client):
    assert client.get("/statistics/summary").status_code == 401


def test_income_expenses_and_net_for_month(client, make_user, category_ids):
    headers = make_user()
    account_id = create_account(client, headers, "1000.00")
    create_tx(client, headers, account_id, category_ids, "INGRESO", "2500.50", f"{MONTH}-01")
    create_tx(client, headers, account_id, category_ids, "GASTO", "300.25", f"{MONTH}-30")
    # Fuera del mes: no debe contar en income/expenses ni en transactions_count.
    create_tx(client, headers, account_id, category_ids, "GASTO", "99.99", "2026-08-31")
    create_tx(client, headers, account_id, category_ids, "INGRESO", "10.00", "2026-10-01")

    res = summary(client, headers, MONTH)
    assert res.status_code == 200
    assert res.json() == {
        "period": MONTH,
        # 1000 + 2500.50 − 300.25 − 99.99 + 10 (el saldo incluye todos los meses)
        "total_balance": "3110.26",
        "income": "2500.50",
        "expenses": "300.25",
        "net": "2200.25",
        "accounts_count": 1,
        "transactions_count": 2,
    }


def test_total_balance_sums_all_accounts(client, make_user, category_ids):
    headers = make_user()
    first = create_account(client, headers, "1500.50")
    create_account(client, headers, "200.00")
    create_account(client, headers, "-350.25")  # tarjeta de crédito con deuda
    create_tx(client, headers, first, category_ids, "GASTO", "0.25", f"{MONTH}-15")

    body = summary(client, headers, MONTH).json()
    assert body["total_balance"] == "1350.00"  # 1500.50 + 200 − 350.25 − 0.25
    assert body["accounts_count"] == 3


def test_empty_user_returns_zeros(client, make_user):
    body = summary(client, make_user(), MONTH).json()
    assert body == {
        "period": MONTH,
        "total_balance": "0.00",
        "income": "0.00",
        "expenses": "0.00",
        "net": "0.00",
        "accounts_count": 0,
        "transactions_count": 0,
    }


def test_negative_net_when_expenses_exceed_income(client, make_user, category_ids):
    headers = make_user()
    account_id = create_account(client, headers, "0")
    create_tx(client, headers, account_id, category_ids, "INGRESO", "100", f"{MONTH}-10")
    create_tx(client, headers, account_id, category_ids, "GASTO", "150.50", f"{MONTH}-11")

    assert summary(client, headers, MONTH).json()["net"] == "-50.50"


def test_defaults_to_current_month(client, make_user, category_ids):
    headers = make_user()
    account_id = create_account(client, headers, "0")
    create_tx(client, headers, account_id, category_ids, "INGRESO", "75", f"{current_month()}-01")

    body = summary(client, headers).json()
    assert body["period"] == current_month()
    assert body["income"] == "75.00"
    assert body["transactions_count"] == 1


def test_other_users_data_is_not_mixed(client, make_user, category_ids):
    owner, other = make_user(), make_user()
    owner_account = create_account(client, owner, "5000")
    create_tx(client, owner, owner_account, category_ids, "INGRESO", "1000", f"{MONTH}-05")
    create_tx(client, owner, owner_account, category_ids, "GASTO", "400", f"{MONTH}-06")

    other_account = create_account(client, other, "10")
    create_tx(client, other, other_account, category_ids, "GASTO", "3", f"{MONTH}-07")

    owner_body = summary(client, owner, MONTH).json()
    assert owner_body["total_balance"] == "5600.00"
    assert owner_body["income"] == "1000.00" and owner_body["expenses"] == "400.00"
    assert owner_body["accounts_count"] == 1 and owner_body["transactions_count"] == 2

    other_body = summary(client, other, MONTH).json()
    assert other_body["total_balance"] == "7.00"
    assert other_body["income"] == "0.00" and other_body["expenses"] == "3.00"
    assert other_body["accounts_count"] == 1 and other_body["transactions_count"] == 1


@pytest.mark.parametrize("month", ["2026-13", "2026-00", "2026-9", "26-09", "2026/09", "abc", ""])
def test_invalid_month_returns_422(client, make_user, month):
    res = client.get("/statistics/summary", params={"month": month}, headers=make_user())
    assert res.status_code == 422


def test_december_range_does_not_overflow(client, make_user, category_ids):
    headers = make_user()
    account_id = create_account(client, headers, "0")
    create_tx(client, headers, account_id, category_ids, "GASTO", "20", "2025-12-31")
    create_tx(client, headers, account_id, category_ids, "GASTO", "5", "2026-01-01")

    body = summary(client, headers, "2025-12").json()
    assert body["expenses"] == "20.00" and body["transactions_count"] == 1
