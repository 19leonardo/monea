"""
Presupuestos. Lo gastado se calcula en PostgreSQL con una subconsulta correlacionada:
para cada presupuesto, SUM(amount) de los GASTOS del mismo usuario y categoría
dentro de su mes. El listado completo sale en una sola consulta.
"""
from decimal import Decimal
from typing import Any

from sqlalchemy import func, literal_column, select
from sqlalchemy.orm import Session, joinedload

from app.models import Budget, Transaction

# Primer día del mes del presupuesto ("2026-10" -> 2026-10-01) y primer día del siguiente.
_month_start = func.to_date(func.concat(Budget.month, "-01"), "YYYY-MM-DD")
_month_end = _month_start + literal_column("interval '1 month'")

spent_expr = (
    select(func.coalesce(func.sum(Transaction.amount), 0))
    .where(
        Transaction.user_id == Budget.user_id,
        Transaction.category_id == Budget.category_id,
        Transaction.type == "GASTO",
        Transaction.date >= _month_start,
        Transaction.date < _month_end,
    )
    .correlate(Budget)
    .scalar_subquery()
    .label("spent")
)


def _with_spent(db: Session):
    return db.query(Budget, spent_expr).options(joinedload(Budget.category))


def list_for_month(db: Session, user_id: int, month: str) -> list[tuple[Budget, Decimal]]:
    rows = (
        _with_spent(db)
        .filter(Budget.user_id == user_id, Budget.month == month)
        .order_by(Budget.created_at, Budget.id)
        .all()
    )
    return [(budget, Decimal(spent)) for budget, spent in rows]


def get_with_spent(db: Session, budget_id: int, user_id: int) -> tuple[Budget, Decimal] | None:
    row = (
        _with_spent(db)
        .filter(Budget.id == budget_id, Budget.user_id == user_id)
        .first()
    )
    return (row[0], Decimal(row[1])) if row else None


def get_by_id_for_user(db: Session, budget_id: int, user_id: int) -> Budget | None:
    return db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user_id).first()


def find_duplicate(
    db: Session, user_id: int, category_id: int, month: str, exclude_id: int | None = None
) -> Budget | None:
    query = db.query(Budget).filter(
        Budget.user_id == user_id, Budget.category_id == category_id, Budget.month == month
    )
    if exclude_id is not None:
        query = query.filter(Budget.id != exclude_id)
    return query.first()


def create(db: Session, *, user_id: int, **fields: Any) -> Budget:
    budget = Budget(user_id=user_id, **fields)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def update(db: Session, budget: Budget, fields: dict[str, Any]) -> Budget:
    for key, value in fields.items():
        setattr(budget, key, value)
    db.commit()
    db.refresh(budget)
    return budget


def delete(db: Session, budget: Budget) -> None:
    db.delete(budget)
    db.commit()
