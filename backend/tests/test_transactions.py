"""Lógica de movimientos y saldos. Requiere las migraciones y el seed aplicados."""
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.models import Account, User

PASSWORD = "Secreta123!"
TODAY = "2026-10-02"


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
def headers(make_user):
    return make_user()


@pytest.fixture
def category_ids(client, headers):
    categories = client.get("/categories", headers=headers).json()
    by_name = {c["name"]: c["id"] for c in categories if c["is_system"]}
    return {"gasto": by_name["Alimentación"], "ingreso": by_name["Salario"]}


def create_account(client, headers, initial="1000.00", name="Billetera"):
    res = client.post(
        "/accounts",
        json={"name": name, "type": "efectivo", "initial_balance": initial},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["id"]


def create_tx(client, headers, account_id, category_id, type_, amount):
    return client.post(
        "/transactions",
        json={
            "account_id": account_id,
            "category_id": category_id,
            "type": type_,
            "amount": amount,
            "description": "prueba",
            "date": TODAY,
        },
        headers=headers,
    )


def balance(client, headers, account_id) -> Decimal:
    return Decimal(client.get(f"/accounts/{account_id}", headers=headers).json()["balance"])


# --- Saldos -----------------------------------------------------------------

def test_income_increases_balance(client, headers, category_ids):
    account_id = create_account(client, headers)

    res = create_tx(client, headers, account_id, category_ids["ingreso"], "INGRESO", "250.75")
    assert res.status_code == 201
    body = res.json()
    assert body["amount"] == "250.75"
    assert body["account_name"] == "Billetera" and body["category_name"] == "Salario"

    assert balance(client, headers, account_id) == Decimal("1250.75")


def test_expense_decreases_balance(client, headers, category_ids):
    account_id = create_account(client, headers)

    res = create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "99.99")
    assert res.status_code == 201
    assert balance(client, headers, account_id) == Decimal("900.01")


def test_decimal_precision_has_no_float_error(client, headers, category_ids):
    account_id = create_account(client, headers, initial="0.00")
    for _ in range(3):
        create_tx(client, headers, account_id, category_ids["ingreso"], "INGRESO", "0.10")

    # Con float daría 0.30000000000000004.
    assert balance(client, headers, account_id) == Decimal("0.30")


def test_delete_reverts_balance(client, headers, category_ids):
    account_id = create_account(client, headers)
    tx_id = create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "300").json()["id"]
    assert balance(client, headers, account_id) == Decimal("700.00")

    assert client.delete(f"/transactions/{tx_id}", headers=headers).status_code == 204
    assert balance(client, headers, account_id) == Decimal("1000.00")
    assert client.get(f"/transactions/{tx_id}", headers=headers).status_code == 404


def test_update_amount_adjusts_balance(client, headers, category_ids):
    account_id = create_account(client, headers)
    tx_id = create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "100").json()["id"]

    res = client.put(f"/transactions/{tx_id}", json={"amount": "250.50"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["amount"] == "250.50"
    assert balance(client, headers, account_id) == Decimal("749.50")


def test_update_type_adjusts_balance(client, headers, category_ids):
    account_id = create_account(client, headers)
    tx_id = create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "100").json()["id"]
    assert balance(client, headers, account_id) == Decimal("900.00")

    # Pasa de gasto a ingreso (con su categoría de ingreso): 1000 + 100.
    res = client.put(
        f"/transactions/{tx_id}",
        json={"type": "INGRESO", "category_id": category_ids["ingreso"]},
        headers=headers,
    )
    assert res.status_code == 200
    assert balance(client, headers, account_id) == Decimal("1100.00")


def test_update_account_moves_effect(client, headers, category_ids):
    origin = create_account(client, headers, name="Origen")
    target = create_account(client, headers, initial="500.00", name="Destino")
    tx_id = create_tx(client, headers, origin, category_ids["gasto"], "GASTO", "200").json()["id"]

    res = client.put(f"/transactions/{tx_id}", json={"account_id": target}, headers=headers)
    assert res.status_code == 200
    assert balance(client, headers, origin) == Decimal("1000.00")
    assert balance(client, headers, target) == Decimal("300.00")


def test_failed_update_does_not_change_balance(client, headers, category_ids):
    account_id = create_account(client, headers)
    tx_id = create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "100").json()["id"]

    # Cambiar a INGRESO sin cambiar la categoría (que es de gasto) falla -> rollback.
    res = client.put(
        f"/transactions/{tx_id}", json={"type": "INGRESO", "amount": "999"}, headers=headers
    )
    assert res.status_code == 422
    assert balance(client, headers, account_id) == Decimal("900.00")
    tx = client.get(f"/transactions/{tx_id}", headers=headers).json()
    assert tx["type"] == "GASTO" and tx["amount"] == "100.00"


def test_recalculate_fixes_balance(client, headers, category_ids):
    account_id = create_account(client, headers)
    create_tx(client, headers, account_id, category_ids["ingreso"], "INGRESO", "500")
    create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "120.25")

    # Se corrompe el saldo a propósito, directo en la BD.
    with SessionLocal() as db:
        db.get(Account, account_id).balance = Decimal("0")
        db.commit()

    res = client.post(f"/accounts/{account_id}/recalculate", headers=headers)
    assert res.status_code == 200
    assert res.json()["balance"] == "1379.75"  # 1000 + 500 − 120.25


# --- Validaciones -----------------------------------------------------------

@pytest.mark.parametrize("amount", ["0", "-50", "10.999"])
def test_invalid_amount_returns_422(client, headers, category_ids, amount):
    account_id = create_account(client, headers)
    res = create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", amount)
    assert res.status_code == 422
    assert balance(client, headers, account_id) == Decimal("1000.00")


def test_category_type_must_match(client, headers, category_ids):
    account_id = create_account(client, headers)
    res = create_tx(client, headers, account_id, category_ids["ingreso"], "GASTO", "10")
    assert res.status_code == 422


def test_account_with_transactions_cannot_be_deleted(client, headers, category_ids):
    account_id = create_account(client, headers)
    create_tx(client, headers, account_id, category_ids["gasto"], "GASTO", "10")
    assert client.delete(f"/accounts/{account_id}", headers=headers).status_code == 409


# --- Listado y filtros ------------------------------------------------------

def test_list_filters_and_order(client, headers, category_ids):
    account_id = create_account(client, headers)
    for day, type_, cat in (
        ("2026-09-01", "GASTO", "gasto"),
        ("2026-09-15", "INGRESO", "ingreso"),
        ("2026-09-30", "GASTO", "gasto"),
    ):
        client.post(
            "/transactions",
            json={
                "account_id": account_id,
                "category_id": category_ids[cat],
                "type": type_,
                "amount": "10",
                "date": day,
            },
            headers=headers,
        )

    all_tx = client.get("/transactions", headers=headers).json()
    assert [t["date"] for t in all_tx] == ["2026-09-30", "2026-09-15", "2026-09-01"]

    gastos = client.get("/transactions?type=GASTO", headers=headers).json()
    assert len(gastos) == 2 and all(t["type"] == "GASTO" for t in gastos)

    ranged = client.get(
        "/transactions?start_date=2026-09-10&end_date=2026-09-20", headers=headers
    ).json()
    assert [t["date"] for t in ranged] == ["2026-09-15"]

    page = client.get("/transactions?limit=1&offset=1", headers=headers).json()
    assert [t["date"] for t in page] == ["2026-09-15"]

    bad_range = client.get(
        "/transactions?start_date=2026-09-30&end_date=2026-09-01", headers=headers
    )
    assert bad_range.status_code == 422


# --- Aislamiento entre usuarios ---------------------------------------------

def test_user_cannot_access_other_users_transaction_or_account(
    client, make_user, category_ids, headers
):
    owner, intruder = headers, make_user()
    account_id = create_account(client, owner)
    tx_id = create_tx(client, owner, account_id, category_ids["gasto"], "GASTO", "50").json()["id"]

    assert client.get(f"/transactions/{tx_id}", headers=intruder).status_code == 404
    assert (
        client.put(f"/transactions/{tx_id}", json={"amount": "1"}, headers=intruder).status_code
        == 404
    )
    assert client.delete(f"/transactions/{tx_id}", headers=intruder).status_code == 404
    assert client.get("/transactions", headers=intruder).json() == []

    # Tampoco puede registrar movimientos en la cuenta ajena ni recalcularla.
    intruder_tx = create_tx(client, intruder, account_id, category_ids["gasto"], "GASTO", "1")
    assert intruder_tx.status_code == 404
    assert client.post(f"/accounts/{account_id}/recalculate", headers=intruder).status_code == 404

    # El saldo del dueño no cambió.
    assert balance(client, owner, account_id) == Decimal("950.00")
