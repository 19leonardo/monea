"""
Acceso a datos de movimientos. Ninguna función hace commit: el servicio agrupa
movimiento + saldo en una sola transacción de base de datos y decide commit/rollback.
"""
import datetime as dt
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Account, Transaction


@dataclass(frozen=True)
class TransactionFilters:
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    type: str | None = None
    account_id: int | None = None
    category_id: int | None = None
    payment_method_id: int | None = None


def _with_names(query):
    return query.options(
        joinedload(Transaction.account),
        joinedload(Transaction.category),
        joinedload(Transaction.payment_method),
    )


def list_by_user(
    db: Session, user_id: int, filters: TransactionFilters, limit: int, offset: int
) -> list[Transaction]:
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if filters.start_date is not None:
        query = query.filter(Transaction.date >= filters.start_date)
    if filters.end_date is not None:
        query = query.filter(Transaction.date <= filters.end_date)
    if filters.type is not None:
        query = query.filter(Transaction.type == filters.type)
    if filters.account_id is not None:
        query = query.filter(Transaction.account_id == filters.account_id)
    if filters.category_id is not None:
        query = query.filter(Transaction.category_id == filters.category_id)
    if filters.payment_method_id is not None:
        query = query.filter(Transaction.payment_method_id == filters.payment_method_id)

    return (
        _with_names(query)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )


def get_by_id_for_user(db: Session, transaction_id: int, user_id: int) -> Transaction | None:
    return (
        _with_names(db.query(Transaction))
        .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .first()
    )


def lock_accounts(db: Session, account_ids: set[int], user_id: int) -> dict[int, Account]:
    """
    Bloquea (SELECT ... FOR UPDATE) las cuentas del usuario cuyo saldo se va a tocar,
    para que dos peticiones simultáneas no pisen el saldo. Orden por id: evita deadlocks.
    """
    accounts = (
        db.query(Account)
        .filter(Account.id.in_(account_ids), Account.user_id == user_id)
        .order_by(Account.id)
        .with_for_update()
        # Relee el saldo de la BD aunque la cuenta ya estuviera cargada en la sesión.
        .populate_existing()
        .all()
    )
    return {account.id: account for account in accounts}


def lock_by_id_for_user(db: Session, transaction_id: int, user_id: int) -> Transaction | None:
    """Bloquea el movimiento para que dos ediciones simultáneas no reviertan dos veces."""
    return (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .with_for_update()
        .populate_existing()
        .first()
    )


def add(db: Session, **fields: Any) -> Transaction:
    transaction = Transaction(**fields)
    db.add(transaction)
    db.flush()
    return transaction


def delete(db: Session, transaction: Transaction) -> None:
    db.delete(transaction)
    db.flush()


def sum_effect_for_account(db: Session, account_id: int) -> Decimal:
    """Σ ingresos − Σ gastos de una cuenta, calculado en PostgreSQL (NUMERIC exacto)."""
    signed = case((Transaction.type == "INGRESO", Transaction.amount), else_=-Transaction.amount)
    total = db.execute(
        select(func.coalesce(func.sum(signed), 0)).where(Transaction.account_id == account_id)
    ).scalar_one()
    return Decimal(total)


def exists_for_account(db: Session, account_id: int) -> bool:
    return db.query(Transaction.id).filter(Transaction.account_id == account_id).first() is not None


def exists_for_category(db: Session, category_id: int) -> bool:
    return (
        db.query(Transaction.id).filter(Transaction.category_id == category_id).first() is not None
    )
