"""Estadísticas para gráficos: /statistics/by-category y /statistics/income-vs-expenses."""
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.months import current_month
from app.database.connection import SessionLocal
from app.main import app
from app.models import User

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
    with SessionLocal() as db:
        db.query(User).filter(User.email.in_(emails)).delete(synchronize_session=False)
        db.commit()


@pytest.fixture
def headers(make_user):
    return make_user()


@pytest.fixture
def cats(client, headers):
    categories = client.get("/categories", headers=headers).json()
    return {c["name"]: c["id"] for c in categories if c["is_system"]}


def new_account(client, headers):
    res = client.post(
        "/accounts", json={"name": "Cuenta", "type": "efectivo", "initial_balance": "10000"},
        headers=headers,
    )
    return res.json()["id"]


def tx(client, headers, account_id, category_id, type_, amount, date=f"{MONTH}-10"):
    res = client.post(
        "/transactions",
        json={
            "account_id": account_id,
            "category_id": category_id,
            "type": type_,
            "amount": amount,
            "date": date,
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text


def by_category(client, headers, **params):
    return client.get("/statistics/by-category", params=params, headers=headers)


def income_vs_expenses(client, headers, **params):
    return client.get("/statistics/income-vs-expenses", params=params, headers=headers)


# --- by-category ------------------------------------------------------------

def test_expenses_grouped_sorted_with_percentages(client, headers, cats):
    account = new_account(client, headers)
    tx(client, headers, account, cats["Transporte"], "GASTO", "200")
    tx(client, headers, account, cats["Alimentación"], "GASTO", "350.50")
    tx(client, headers, account, cats["Alimentación"], "GASTO", "149.50")  # se suma a la anterior
    tx(client, headers, account, cats["Vivienda"], "GASTO", "300")
    # No cuentan: ingresos y otros meses.
    tx(client, headers, account, cats["Salario"], "INGRESO", "5000")
    tx(client, headers, account, cats["Alimentación"], "GASTO", "999", date="2026-08-31")
    tx(client, headers, account, cats["Alimentación"], "GASTO", "999", date="2026-10-01")

    res = by_category(client, headers, month=MONTH)  # type por defecto: gasto
    assert res.status_code == 200
    body = res.json()
    assert body["period"] == MONTH and body["type"] == "gasto"
    assert body["total"] == "1000.00"
    assert [(i["category_name"], i["total"], i["percentage"]) for i in body["items"]] == [
        ("Alimentación", "500.00", "50.0"),
        ("Vivienda", "300.00", "30.0"),
        ("Transporte", "200.00", "20.0"),
    ]
    assert body["items"][0]["category_id"] == cats["Alimentación"]
    assert body["items"][0]["category_icon"] == "food"


def test_income_type(client, headers, cats):
    account = new_account(client, headers)
    tx(client, headers, account, cats["Salario"], "INGRESO", "3000")
    tx(client, headers, account, cats["Ventas"], "INGRESO", "1000")
    tx(client, headers, account, cats["Alimentación"], "GASTO", "50")

    body = by_category(client, headers, month=MONTH, type="ingreso").json()
    assert body["type"] == "ingreso" and body["total"] == "4000.00"
    assert [(i["category_name"], i["percentage"]) for i in body["items"]] == [
        ("Salario", "75.0"),
        ("Ventas", "25.0"),
    ]


def test_percentages_add_up_to_about_100(client, headers, cats):
    account = new_account(client, headers)
    for name in ("Alimentación", "Transporte", "Vivienda"):
        tx(client, headers, account, cats[name], "GASTO", "100")

    body = by_category(client, headers, month=MONTH).json()
    percentages = [Decimal(i["percentage"]) for i in body["items"]]
    assert percentages == [Decimal("33.3")] * 3
    assert abs(sum(percentages) - 100) <= Decimal("0.3")  # redondeo a 1 decimal


def test_ties_are_ordered_by_name(client, headers, cats):
    account = new_account(client, headers)
    tx(client, headers, account, cats["Vivienda"], "GASTO", "100")
    tx(client, headers, account, cats["Compras"], "GASTO", "100")

    names = [i["category_name"] for i in by_category(client, headers, month=MONTH).json()["items"]]
    assert names == ["Compras", "Vivienda"]


def test_empty_month_returns_no_items(client, headers):
    body = by_category(client, headers, month=MONTH).json()
    assert body == {"period": MONTH, "type": "gasto", "total": "0.00", "items": []}


def test_by_category_defaults_to_current_month(client, headers, cats):
    account = new_account(client, headers)
    tx(client, headers, account, cats["Salud"], "GASTO", "80", date=f"{current_month()}-01")

    body = by_category(client, headers).json()
    assert body["period"] == current_month()
    assert [i["category_name"] for i in body["items"]] == ["Salud"]


@pytest.mark.parametrize(
    "params",
    [
        {"month": "2026-13"},
        {"month": "2026/09"},
        {"type": "GASTO"},
        {"type": "otro"},
    ],
)
def test_by_category_invalid_params_return_422(client, headers, params):
    assert by_category(client, headers, **params).status_code == 422


# --- income-vs-expenses -----------------------------------------------------

def test_income_vs_expenses(client, headers, cats):
    account = new_account(client, headers)
    tx(client, headers, account, cats["Salario"], "INGRESO", "3000")
    tx(client, headers, account, cats["Ventas"], "INGRESO", "500.25")
    tx(client, headers, account, cats["Alimentación"], "GASTO", "1200.75")
    tx(client, headers, account, cats["Salario"], "INGRESO", "9999", date="2026-10-01")

    res = income_vs_expenses(client, headers, month=MONTH)
    assert res.status_code == 200
    assert res.json() == {
        "period": MONTH,
        "income": "3500.25",
        "expenses": "1200.75",
        "net": "2299.50",
    }


def test_income_vs_expenses_empty_month(client, headers):
    assert income_vs_expenses(client, headers, month=MONTH).json() == {
        "period": MONTH,
        "income": "0.00",
        "expenses": "0.00",
        "net": "0.00",
    }


def test_income_vs_expenses_invalid_month_returns_422(client, headers):
    assert income_vs_expenses(client, headers, month="abc").status_code == 422


# --- Aislamiento ------------------------------------------------------------

def test_other_users_data_is_not_mixed(client, make_user, headers, cats):
    account = new_account(client, headers)
    tx(client, headers, account, cats["Alimentación"], "GASTO", "100")
    tx(client, headers, account, cats["Salario"], "INGRESO", "1000")

    other = make_user()
    other_account = new_account(client, other)
    tx(client, other, other_account, cats["Alimentación"], "GASTO", "5000")
    tx(client, other, other_account, cats["Transporte"], "GASTO", "7")

    body = by_category(client, headers, month=MONTH).json()
    assert body["total"] == "100.00"
    assert [(i["category_name"], i["total"]) for i in body["items"]] == [("Alimentación", "100.00")]

    assert income_vs_expenses(client, headers, month=MONTH).json()["expenses"] == "100.00"
    assert income_vs_expenses(client, other, month=MONTH).json()["income"] == "0.00"


def test_requires_auth(client):
    assert client.get("/statistics/by-category").status_code == 401
    assert client.get("/statistics/income-vs-expenses").status_code == 401
