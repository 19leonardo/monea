"""Presupuestos: lo gastado se calcula a partir de los movimientos. Requiere la migración."""
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.months import current_month
from app.database.connection import SessionLocal
from app.main import app
from app.models import User
from app.services.budget_service import compute_percentage

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
    # ON DELETE CASCADE elimina también sus cuentas, movimientos y presupuestos.
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
    return {
        "food": by_name["Alimentación"],
        "transport": by_name["Transporte"],
        "salary": by_name["Salario"],
    }


@pytest.fixture
def account_id(client, headers):
    res = client.post(
        "/accounts", json={"name": "Cuenta", "type": "efectivo", "initial_balance": "5000"},
        headers=headers,
    )
    return res.json()["id"]


def create_budget(client, headers, category_id, amount="800.00", month=MONTH, **extra):
    return client.post(
        "/budgets",
        json={"category_id": category_id, "amount": amount, "month": month, **extra},
        headers=headers,
    )


def spend(client, headers, account_id, category_id, amount, date=f"{MONTH}-15", type_="GASTO"):
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
    return res.json()["id"]


def get_budget(client, headers, budget_id):
    return client.get(f"/budgets/{budget_id}", headers=headers).json()


# --- Crear y calcular -------------------------------------------------------

def test_create_budget_starts_empty(client, headers, cats):
    res = create_budget(client, headers, cats["food"])
    assert res.status_code == 201
    body = res.json()
    assert body["category_name"] == "Alimentación"
    assert body["amount"] == "800.00" and body["month"] == MONTH and body["period"] == "mensual"
    assert (body["alert_70"], body["alert_90"], body["alert_100"]) == (70, 90, 100)
    assert body["spent"] == "0.00"
    assert body["available"] == "800.00"
    assert body["percentage"] == 0
    assert body["alert_level"] is None


def test_spent_reflects_expense_and_drops_when_deleted(client, headers, cats, account_id):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]

    tx_id = spend(client, headers, account_id, cats["food"], "650.00")
    body = get_budget(client, headers, budget_id)
    assert body["spent"] == "650.00"
    assert body["available"] == "150.00"
    assert body["percentage"] == 81  # 650 / 800 = 81.25 %
    assert body["alert_level"] == 70

    assert client.delete(f"/transactions/{tx_id}", headers=headers).status_code == 204
    body = get_budget(client, headers, budget_id)
    assert body["spent"] == "0.00" and body["percentage"] == 0 and body["alert_level"] is None


def test_spent_only_counts_same_category_month_and_expenses(client, headers, cats, account_id):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]
    spend(client, headers, account_id, cats["food"], "100", date=f"{MONTH}-01")
    spend(client, headers, account_id, cats["food"], "50", date=f"{MONTH}-30")
    # No cuentan: otra categoría, otro mes, un ingreso.
    spend(client, headers, account_id, cats["transport"], "999")
    spend(client, headers, account_id, cats["food"], "777", date="2026-08-31")
    spend(client, headers, account_id, cats["food"], "888", date="2026-10-01")
    spend(client, headers, account_id, cats["salary"], "5000", type_="INGRESO")

    assert get_budget(client, headers, budget_id)["spent"] == "150.00"


@pytest.mark.parametrize(
    ("spent", "percentage", "alert_level"),
    [
        ("559.00", 70, 70),   # 69.875 % redondea a 70 → alcanza el primer umbral
        ("719.99", 90, 90),   # 89.99875 % → 90
        ("800.00", 100, 100),
        ("1000.00", 125, 100),  # pasado del tope: available negativo
        ("400.00", 50, None),
    ],
)
def test_percentage_and_alert_levels(client, headers, cats, account_id, spent, percentage, alert_level):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]
    spend(client, headers, account_id, cats["food"], spent)

    body = get_budget(client, headers, budget_id)
    assert body["percentage"] == percentage
    assert body["alert_level"] == alert_level
    assert Decimal(body["available"]) == Decimal("800.00") - Decimal(spent)


def test_custom_thresholds(client, headers, cats, account_id):
    budget_id = create_budget(
        client, headers, cats["food"], amount="100", alert_70=50, alert_90=75, alert_100=95
    ).json()["id"]
    spend(client, headers, account_id, cats["food"], "80")
    body = get_budget(client, headers, budget_id)
    assert body["percentage"] == 80 and body["alert_level"] == 90


def test_compute_percentage_handles_zero_amount():
    assert compute_percentage(Decimal("0"), Decimal("0")) == 0
    assert compute_percentage(Decimal("5"), Decimal("0")) == 100


# --- Listado ----------------------------------------------------------------

def test_list_by_month_with_computed_fields(client, headers, cats, account_id):
    create_budget(client, headers, cats["food"], amount="800")
    create_budget(client, headers, cats["transport"], amount="200")
    create_budget(client, headers, cats["food"], amount="900", month="2026-08")
    spend(client, headers, account_id, cats["transport"], "50")

    budgets = client.get("/budgets", params={"month": MONTH}, headers=headers).json()
    assert [b["category_name"] for b in budgets] == ["Alimentación", "Transporte"]
    transport = budgets[1]
    assert transport["spent"] == "50.00" and transport["percentage"] == 25


def test_list_defaults_to_current_month(client, headers, cats):
    create_budget(client, headers, cats["food"], month=current_month())
    create_budget(client, headers, cats["transport"], month="2020-01")

    budgets = client.get("/budgets", headers=headers).json()
    assert [b["month"] for b in budgets] == [current_month()]


def test_list_invalid_month_returns_422(client, headers):
    assert client.get("/budgets", params={"month": "2026-13"}, headers=headers).status_code == 422


# --- Validaciones -----------------------------------------------------------

def test_duplicate_category_and_month_returns_409(client, headers, cats):
    assert create_budget(client, headers, cats["food"]).status_code == 201
    assert create_budget(client, headers, cats["food"], amount="50").status_code == 409
    # Otro mes sí se permite.
    assert create_budget(client, headers, cats["food"], month="2026-10").status_code == 201


def test_update_to_existing_category_month_returns_409(client, headers, cats):
    create_budget(client, headers, cats["food"])
    other_id = create_budget(client, headers, cats["transport"]).json()["id"]
    res = client.put(f"/budgets/{other_id}", json={"category_id": cats["food"]}, headers=headers)
    assert res.status_code == 409


def test_income_category_is_rejected(client, headers, cats):
    assert create_budget(client, headers, cats["salary"]).status_code == 422


@pytest.mark.parametrize(
    "body",
    [
        {"amount": "0"},
        {"amount": "-10"},
        {"amount": "10.999"},
        {"month": "2026-13"},
        {"month": "2026-9"},
        {"alert_70": 95, "alert_90": 90},
    ],
)
def test_invalid_create_returns_422(client, headers, cats, body):
    payload = {"category_id": cats["food"], "amount": "100", "month": MONTH, **body}
    assert client.post("/budgets", json=payload, headers=headers).status_code == 422


def test_update_amount_recomputes(client, headers, cats, account_id):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]
    spend(client, headers, account_id, cats["food"], "650")

    res = client.put(f"/budgets/{budget_id}", json={"amount": "1300"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["percentage"] == 50 and res.json()["alert_level"] is None

    res = client.put(f"/budgets/{budget_id}", json={"alert_90": 60}, headers=headers)
    assert res.status_code == 422  # 70 < 60 rompe el orden


def test_delete_budget(client, headers, cats):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]
    assert client.delete(f"/budgets/{budget_id}", headers=headers).status_code == 204
    assert client.get(f"/budgets/{budget_id}", headers=headers).status_code == 404


# --- Aislamiento ------------------------------------------------------------

def test_other_users_budget_returns_404(client, make_user, headers, cats):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]
    intruder = make_user()

    assert client.get(f"/budgets/{budget_id}", headers=intruder).status_code == 404
    assert (
        client.put(f"/budgets/{budget_id}", json={"amount": "1"}, headers=intruder).status_code
        == 404
    )
    assert client.delete(f"/budgets/{budget_id}", headers=intruder).status_code == 404
    assert client.get("/budgets", params={"month": MONTH}, headers=intruder).json() == []


def test_spent_ignores_other_users_expenses(client, make_user, headers, cats, account_id):
    budget_id = create_budget(client, headers, cats["food"]).json()["id"]

    other = make_user()
    other_account = client.post(
        "/accounts", json={"name": "X", "type": "efectivo", "initial_balance": "1000"},
        headers=other,
    ).json()["id"]
    spend(client, other, other_account, cats["food"], "500")

    assert get_budget(client, headers, budget_id)["spent"] == "0.00"


def test_requires_auth(client):
    assert client.get("/budgets").status_code == 401
