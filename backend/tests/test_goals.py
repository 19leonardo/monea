"""Metas de ahorro y aportes. Requiere la migración de savings_goals/goal_contributions."""
import datetime as dt
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core import months
from app.database.connection import SessionLocal
from app.main import app
from app.models import User
from app.services import goal_service
from app.services.goal_service import months_left

PASSWORD = "Secreta123!"
TODAY = dt.date(2026, 10, 5)


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    """"Hoy" fijo para que fechas y recommended_monthly sean deterministas."""
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
    # ON DELETE CASCADE elimina también sus metas y aportes.
    with SessionLocal() as db:
        db.query(User).filter(User.email.in_(emails)).delete(synchronize_session=False)
        db.commit()


@pytest.fixture
def headers(make_user):
    return make_user()


def create_goal(client, headers, target="1000.00", **extra):
    return client.post(
        "/goals", json={"name": "Viaje a Cusco", "target_amount": target, **extra}, headers=headers
    )


def contribute(client, headers, goal_id, amount, **extra):
    return client.post(
        f"/goals/{goal_id}/contributions", json={"amount": amount, **extra}, headers=headers
    )


# --- Crear ------------------------------------------------------------------

def test_create_goal(client, headers):
    res = create_goal(client, headers, description="Ahorro para vacaciones")
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Viaje a Cusco" and body["description"] == "Ahorro para vacaciones"
    assert body["target_amount"] == "1000.00"
    assert body["current_amount"] == "0.00"
    assert body["status"] == "activa"
    assert body["progress"] == "0.00"
    assert body["remaining"] == "1000.00"
    assert body["recommended_monthly"] is None  # sin fecha objetivo


@pytest.mark.parametrize(
    "body",
    [
        {"name": "X", "target_amount": "0"},
        {"name": "X", "target_amount": "-5"},
        {"name": "X", "target_amount": "10.999"},
        {"name": "   ", "target_amount": "100"},
        {"name": "X", "target_amount": "100", "target_date": "2026-10-04"},  # en el pasado
    ],
)
def test_invalid_goal_returns_422(client, headers, body):
    assert client.post("/goals", json=body, headers=headers).status_code == 422


# --- Aportes ----------------------------------------------------------------

def test_contribution_raises_current_amount_and_progress(client, headers):
    goal_id = create_goal(client, headers).json()["id"]

    res = contribute(client, headers, goal_id, "250.50")
    assert res.status_code == 201
    body = res.json()
    assert body["current_amount"] == "250.50"
    assert body["progress"] == "25.05"
    assert body["remaining"] == "749.50"
    assert body["status"] == "activa"

    body = contribute(client, headers, goal_id, "100").json()
    assert body["current_amount"] == "350.50" and body["progress"] == "35.05"

    history = client.get(f"/goals/{goal_id}/contributions", headers=headers).json()
    assert [c["amount"] for c in history] == ["100.00", "250.50"]
    assert history[0]["date"] == TODAY.isoformat()  # fecha por defecto: hoy


def test_reaching_target_completes_goal(client, headers):
    goal_id = create_goal(client, headers, target="500").json()["id"]
    contribute(client, headers, goal_id, "499.99")
    assert client.get(f"/goals/{goal_id}", headers=headers).json()["status"] == "activa"

    body = contribute(client, headers, goal_id, "0.01").json()
    assert body["status"] == "completada"
    assert body["progress"] == "100.00" and body["remaining"] == "0.00"


def test_overshooting_target(client, headers):
    goal_id = create_goal(client, headers, target="300").json()["id"]
    body = contribute(client, headers, goal_id, "350").json()
    assert body["status"] == "completada"
    assert body["progress"] == "116.67"
    assert body["remaining"] == "0.00"  # nunca negativo


@pytest.mark.parametrize("amount", ["0", "-10", "1.234"])
def test_invalid_contribution_returns_422(client, headers, amount):
    goal_id = create_goal(client, headers).json()["id"]
    assert contribute(client, headers, goal_id, amount).status_code == 422
    assert client.get(f"/goals/{goal_id}", headers=headers).json()["current_amount"] == "0.00"


def test_future_contribution_date_returns_422(client, headers):
    goal_id = create_goal(client, headers).json()["id"]
    assert contribute(client, headers, goal_id, "10", date="2026-10-06").status_code == 422


def test_cannot_contribute_to_cancelled_goal(client, headers):
    goal_id = create_goal(client, headers).json()["id"]
    client.put(f"/goals/{goal_id}", json={"status": "cancelada"}, headers=headers)
    assert contribute(client, headers, goal_id, "10").status_code == 422


# --- Atomicidad -------------------------------------------------------------

def test_contribution_overflow_rolls_back(client, headers):
    goal_id = create_goal(client, headers, target="9999999999.99").json()["id"]
    assert contribute(client, headers, goal_id, "9999999999.00").status_code == 201

    # current_amount superaría NUMERIC(12,2): falla y no queda NADA del segundo aporte.
    assert contribute(client, headers, goal_id, "10").status_code == 422
    assert client.get(f"/goals/{goal_id}", headers=headers).json()["current_amount"] == "9999999999.00"
    assert len(client.get(f"/goals/{goal_id}/contributions", headers=headers).json()) == 1


def test_contribution_is_atomic_when_update_fails(client, headers, monkeypatch):
    goal_id = create_goal(client, headers).json()["id"]

    # Falla DESPUÉS de insertar el aporte, al actualizar la meta.
    def boom(goal):
        raise RuntimeError("fallo simulado")

    monkeypatch.setattr(goal_service, "_status_for_amounts", boom)
    with TestClient(app, raise_server_exceptions=False) as failing_client:
        assert contribute(failing_client, headers, goal_id, "200").status_code == 500
    monkeypatch.undo()
    monkeypatch.setattr(months, "local_today", lambda: TODAY)

    # Rollback: ni aporte guardado ni current_amount modificado.
    assert client.get(f"/goals/{goal_id}", headers=headers).json()["current_amount"] == "0.00"
    assert client.get(f"/goals/{goal_id}/contributions", headers=headers).json() == []


# --- Cálculos ---------------------------------------------------------------

@pytest.mark.parametrize(
    ("target_date", "expected"),
    [
        (dt.date(2026, 12, 31), 3),  # oct, nov, dic
        (dt.date(2026, 11, 5), 1),
        (dt.date(2026, 11, 6), 2),
        (dt.date(2026, 10, 5), 1),  # hoy: aún queda este mes
        (dt.date(2027, 10, 5), 12),
    ],
)
def test_months_left(target_date, expected):
    assert months_left(TODAY, target_date) == expected


def test_remaining_and_recommended_monthly(client, headers):
    goal_id = create_goal(client, headers, target="1000", target_date="2026-12-31").json()["id"]
    body = contribute(client, headers, goal_id, "100").json()

    assert body["remaining"] == "900.00"
    assert body["recommended_monthly"] == "300.00"  # 900 / 3 meses


def test_recommended_monthly_rounds_up(client, headers):
    # 1000 / 3 = 333.333… -> 333.34 (redondeo hacia arriba para llegar a tiempo)
    body = create_goal(client, headers, target="1000", target_date="2026-12-31").json()
    assert body["recommended_monthly"] == "333.34"


def test_recommended_monthly_null_when_expired_or_completed(client, headers, monkeypatch):
    goal_id = create_goal(client, headers, target="100", target_date="2026-10-31").json()["id"]

    monkeypatch.setattr(months, "local_today", lambda: dt.date(2026, 11, 1))  # ya venció
    assert client.get(f"/goals/{goal_id}", headers=headers).json()["recommended_monthly"] is None

    monkeypatch.setattr(months, "local_today", lambda: TODAY)
    body = contribute(client, headers, goal_id, "100").json()
    assert body["status"] == "completada" and body["recommended_monthly"] is None


# --- Editar / borrar --------------------------------------------------------

def test_raising_target_reactivates_completed_goal(client, headers):
    goal_id = create_goal(client, headers, target="100").json()["id"]
    contribute(client, headers, goal_id, "100")

    body = client.put(f"/goals/{goal_id}", json={"target_amount": "150"}, headers=headers).json()
    assert body["status"] == "activa" and body["remaining"] == "50.00"


def test_cannot_mark_completed_without_reaching_target(client, headers):
    goal_id = create_goal(client, headers).json()["id"]
    res = client.put(f"/goals/{goal_id}", json={"status": "completada"}, headers=headers)
    assert res.status_code == 422


def test_delete_goal_removes_contributions(client, headers):
    goal_id = create_goal(client, headers).json()["id"]
    contribute(client, headers, goal_id, "10")
    assert client.delete(f"/goals/{goal_id}", headers=headers).status_code == 204
    assert client.get(f"/goals/{goal_id}", headers=headers).status_code == 404


def test_list_and_filter_by_status(client, headers):
    first = create_goal(client, headers, target="10").json()["id"]
    create_goal(client, headers, target="999")
    contribute(client, headers, first, "10")

    assert len(client.get("/goals", headers=headers).json()) == 2
    completed = client.get("/goals", params={"status": "completada"}, headers=headers).json()
    assert [g["id"] for g in completed] == [first]


# --- Aislamiento ------------------------------------------------------------

def test_other_users_goal_returns_404(client, make_user, headers):
    goal_id = create_goal(client, headers).json()["id"]
    intruder = make_user()

    assert client.get(f"/goals/{goal_id}", headers=intruder).status_code == 404
    assert client.put(f"/goals/{goal_id}", json={"name": "X"}, headers=intruder).status_code == 404
    assert client.delete(f"/goals/{goal_id}", headers=intruder).status_code == 404
    assert contribute(client, intruder, goal_id, "10").status_code == 404
    assert client.get(f"/goals/{goal_id}/contributions", headers=intruder).status_code == 404
    assert client.get("/goals", headers=intruder).json() == []

    # La meta del dueño no cambió.
    assert client.get(f"/goals/{goal_id}", headers=headers).json()["current_amount"] == "0.00"


def test_requires_auth(client):
    assert client.get("/goals").status_code == 401
