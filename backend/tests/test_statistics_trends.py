"""Evolución mensual (/statistics/monthly) y comparación con el mes anterior (/statistics/comparison)."""
import datetime as dt
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core import months
from app.database.connection import SessionLocal
from app.main import app
from app.models import User

PASSWORD = "Secreta123!"
TODAY = dt.date(2026, 10, 5)


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    """"Hoy" fijo: el mes actual es 2026-10 y han pasado 5 días."""
    monkeypatch.setattr(months, "local_today", lambda: TODAY)


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
    by_name = {c["name"]: c["id"] for c in categories if c["is_system"]}
    return {"GASTO": by_name["Alimentación"], "INGRESO": by_name["Salario"]}


@pytest.fixture
def add(client, headers, cats):
    """add(type, amount, date, headers=None): registra un movimiento en una cuenta del usuario."""
    accounts: dict[str, int] = {}

    def _add(type_, amount, date, user_headers=None):
        user_headers = user_headers or headers
        key = user_headers["Authorization"]
        if key not in accounts:
            accounts[key] = client.post(
                "/accounts",
                json={"name": "Cuenta", "type": "efectivo", "initial_balance": "100000"},
                headers=user_headers,
            ).json()["id"]
        res = client.post(
            "/transactions",
            json={
                "account_id": accounts[key],
                "category_id": cats[type_],
                "type": type_,
                "amount": amount,
                "date": date,
            },
            headers=user_headers,
        )
        assert res.status_code == 201, res.text

    return _add


def monthly(client, headers, **params):
    return client.get("/statistics/monthly", params=params, headers=headers)


def comparison(client, headers, **params):
    return client.get("/statistics/comparison", params=params, headers=headers)


# --- /statistics/monthly ----------------------------------------------------

def test_monthly_default_six_months_with_empty_months_in_zero(client, headers, add):
    add("INGRESO", "1000", "2026-07-01")
    add("GASTO", "200.50", "2026-07-31")
    add("GASTO", "99.50", "2026-07-15")
    add("GASTO", "300", "2026-09-10")
    add("INGRESO", "500", "2026-10-02")
    # Fuera de la ventana de 6 meses (mayo a octubre).
    add("GASTO", "777", "2026-04-30")
    add("GASTO", "888", "2026-11-01")

    res = monthly(client, headers)
    assert res.status_code == 200
    assert res.json()["series"] == [
        {"month": "2026-05", "income": "0.00", "expenses": "0.00"},
        {"month": "2026-06", "income": "0.00", "expenses": "0.00"},
        {"month": "2026-07", "income": "1000.00", "expenses": "300.00"},
        {"month": "2026-08", "income": "0.00", "expenses": "0.00"},
        {"month": "2026-09", "income": "0.00", "expenses": "300.00"},
        {"month": "2026-10", "income": "500.00", "expenses": "0.00"},
    ]


def test_monthly_custom_count_crosses_year(client, headers, add):
    add("GASTO", "50", "2025-12-20")

    series = monthly(client, headers, months=12).json()["series"]
    assert len(series) == 12
    assert series[0]["month"] == "2025-11" and series[-1]["month"] == "2026-10"
    months_list = [point["month"] for point in series]
    assert months_list == sorted(months_list)  # del más antiguo al más reciente
    assert series[1] == {"month": "2025-12", "income": "0.00", "expenses": "50.00"}


def test_monthly_single_month(client, headers):
    assert monthly(client, headers, months=1).json()["series"] == [
        {"month": "2026-10", "income": "0.00", "expenses": "0.00"}
    ]


@pytest.mark.parametrize("value", [0, 25, -1, "abc"])
def test_monthly_invalid_months_returns_422(client, headers, value):
    assert monthly(client, headers, months=value).status_code == 422


# --- /statistics/comparison -------------------------------------------------

def test_comparison_change_pct_and_daily_average(client, headers, add):
    add("GASTO", "1000", "2026-09-15")
    add("INGRESO", "2000", "2026-09-01")
    add("GASTO", "1150", "2026-10-03")
    add("INGRESO", "1500", "2026-10-01")

    res = comparison(client, headers, month="2026-10")
    assert res.status_code == 200
    assert res.json() == {
        "period": "2026-10",
        "previous_period": "2026-09",
        "expenses": "1150.00",
        "previous_expenses": "1000.00",
        "expenses_change_pct": "15.0",
        "income": "1500.00",
        "previous_income": "2000.00",
        "income_change_pct": "-25.0",
        "daily_avg_expense": "230.00",  # mes actual: 1150 / 5 días transcurridos
    }


def test_comparison_defaults_to_current_month(client, headers, add):
    add("GASTO", "100", "2026-10-01")
    body = comparison(client, headers).json()
    assert body["period"] == "2026-10" and body["expenses"] == "100.00"


def test_previous_month_zero_gives_null_change(client, headers, add):
    add("GASTO", "500", "2026-10-02")
    add("INGRESO", "800", "2026-10-02")

    body = comparison(client, headers, month="2026-10").json()
    assert body["previous_expenses"] == "0.00" and body["expenses_change_pct"] is None
    assert body["previous_income"] == "0.00" and body["income_change_pct"] is None


def test_both_months_empty(client, headers):
    body = comparison(client, headers, month="2026-10").json()
    assert body["expenses"] == "0.00" and body["expenses_change_pct"] is None
    assert body["daily_avg_expense"] == "0.00"


def test_past_month_uses_all_its_days(client, headers, add):
    add("GASTO", "1000", "2026-09-30")
    add("GASTO", "1000", "2026-08-10")

    body = comparison(client, headers, month="2026-09").json()
    assert body["daily_avg_expense"] == "33.33"  # 1000 / 30 días de septiembre
    assert body["expenses_change_pct"] == "0.0"

    # Enero compara contra diciembre del año anterior.
    assert comparison(client, headers, month="2026-01").json()["previous_period"] == "2025-12"


def test_future_month_has_no_daily_average(client, headers):
    body = comparison(client, headers, month="2026-11").json()
    assert body["daily_avg_expense"] is None


@pytest.mark.parametrize("month", ["2026-13", "2026-9", "abc"])
def test_comparison_invalid_month_returns_422(client, headers, month):
    assert comparison(client, headers, month=month).status_code == 422


# --- Aislamiento ------------------------------------------------------------

def test_other_users_data_is_not_mixed(client, make_user, headers, add):
    add("GASTO", "100", "2026-10-01")
    add("GASTO", "100", "2026-09-01")

    other = make_user()
    add("GASTO", "5000", "2026-10-01", user_headers=other)
    add("INGRESO", "9000", "2026-09-01", user_headers=other)

    series = monthly(client, headers, months=2).json()["series"]
    assert series == [
        {"month": "2026-09", "income": "0.00", "expenses": "100.00"},
        {"month": "2026-10", "income": "0.00", "expenses": "100.00"},
    ]
    body = comparison(client, headers, month="2026-10").json()
    assert body["expenses"] == "100.00" and body["previous_income"] == "0.00"


def test_requires_auth(client):
    assert client.get("/statistics/monthly").status_code == 401
    assert client.get("/statistics/comparison").status_code == 401
