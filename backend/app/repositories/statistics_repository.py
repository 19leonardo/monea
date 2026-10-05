"""
Consultas agregadas para estadísticas. Todo se suma en PostgreSQL (NUMERIC exacto):
nunca se traen filas a memoria para sumarlas en Python.
"""
import datetime as dt
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Account, Transaction


@dataclass(frozen=True)
class AccountTotals:
    balance: Decimal
    count: int


@dataclass(frozen=True)
class TransactionTotals:
    income: Decimal
    expenses: Decimal
    count: int


def account_totals(db: Session, user_id: int) -> AccountTotals:
    """SUM(balance) y COUNT de todas las cuentas del usuario, en una sola consulta."""
    balance, count = db.execute(
        select(func.coalesce(func.sum(Account.balance), 0), func.count(Account.id)).where(
            Account.user_id == user_id
        )
    ).one()
    return AccountTotals(balance=Decimal(balance), count=count)


def transaction_totals(
    db: Session, user_id: int, start: dt.date, end_exclusive: dt.date
) -> TransactionTotals:
    """
    Ingresos, gastos y cantidad de movimientos en [start, end_exclusive), en una
    sola consulta con SUM condicionales (aprovecha el índice (user_id, date)).
    """
    income = func.sum(case((Transaction.type == "INGRESO", Transaction.amount), else_=0))
    expenses = func.sum(case((Transaction.type == "GASTO", Transaction.amount), else_=0))

    income_total, expenses_total, count = db.execute(
        select(
            func.coalesce(income, 0),
            func.coalesce(expenses, 0),
            func.count(Transaction.id),
        ).where(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date < end_exclusive,
        )
    ).one()
    return TransactionTotals(
        income=Decimal(income_total), expenses=Decimal(expenses_total), count=count
    )
