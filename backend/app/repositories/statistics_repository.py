"""
Consultas agregadas para estadísticas. Todo se suma en PostgreSQL (NUMERIC exacto):
nunca se traen filas a memoria para sumarlas en Python.
"""
import datetime as dt
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Account, Category, Transaction


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


@dataclass(frozen=True)
class CategoryTotal:
    category_id: int
    category_name: str
    category_icon: str
    total: Decimal


def totals_by_category(
    db: Session, user_id: int, transaction_type: str, start: dt.date, end_exclusive: dt.date
) -> list[CategoryTotal]:
    """
    SUM(amount) por categoría con GROUP BY + JOIN a categories (para el nombre),
    de mayor a menor. Solo devuelve una fila por categoría, no los movimientos.
    """
    total = func.sum(Transaction.amount).label("total")
    rows = db.execute(
        select(Category.id, Category.name, Category.icon, total)
        .select_from(Transaction)
        .join(Category, Category.id == Transaction.category_id)
        .where(
            Transaction.user_id == user_id,
            Transaction.type == transaction_type,
            Transaction.date >= start,
            Transaction.date < end_exclusive,
        )
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(total.desc(), Category.name)
    ).all()
    return [
        CategoryTotal(category_id=id_, category_name=name, category_icon=icon, total=Decimal(sum_))
        for id_, name, icon, sum_ in rows
    ]
