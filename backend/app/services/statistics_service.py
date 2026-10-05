from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.core.months import current_month, parse_month
from app.models import User
from app.repositories import statistics_repository
from app.schemas.statistics import (
    ByCategoryRead,
    CategoryTotalRead,
    IncomeVsExpensesRead,
    StatisticsType,
    SummaryRead,
)

__all__ = ["current_month", "get_by_category", "get_income_vs_expenses", "get_summary"]

_CENTS = Decimal("0.01")
_ONE_DECIMAL = Decimal("0.1")
# Tipo del filtro (como las categorías) -> tipo guardado en transactions.
_TRANSACTION_TYPE = {"gasto": "GASTO", "ingreso": "INGRESO"}


def _money(value: Decimal) -> Decimal:
    """Siempre con 2 decimales: 0 -> 0.00, para que el JSON sea "0.00"."""
    return value.quantize(_CENTS)


def _period_range(month: str | None):
    period = month if month is not None else current_month()
    start, end_exclusive = parse_month(period)  # formato inválido -> 422
    return period, start, end_exclusive


def get_summary(db: Session, user: User, month: str | None = None) -> SummaryRead:
    period, start, end_exclusive = _period_range(month)

    accounts = statistics_repository.account_totals(db, user.id)
    transactions = statistics_repository.transaction_totals(db, user.id, start, end_exclusive)

    return SummaryRead(
        period=period,
        total_balance=_money(accounts.balance),
        income=_money(transactions.income),
        expenses=_money(transactions.expenses),
        net=_money(transactions.income - transactions.expenses),
        accounts_count=accounts.count,
        transactions_count=transactions.count,
    )


def get_by_category(
    db: Session, user: User, month: str | None = None, category_type: StatisticsType = "gasto"
) -> ByCategoryRead:
    period, start, end_exclusive = _period_range(month)
    rows = statistics_repository.totals_by_category(
        db, user.id, _TRANSACTION_TYPE[category_type], start, end_exclusive
    )
    # Suma de los subtotales ya agregados en SQL (una fila por categoría, no por movimiento).
    total = sum((row.total for row in rows), Decimal("0"))

    items = []
    if total > 0:
        items = [
            CategoryTotalRead(
                category_id=row.category_id,
                category_name=row.category_name,
                category_icon=row.category_icon,
                total=_money(row.total),
                percentage=(row.total / total * 100).quantize(_ONE_DECIMAL, rounding=ROUND_HALF_UP),
            )
            for row in rows
        ]
    return ByCategoryRead(period=period, type=category_type, total=_money(total), items=items)


def get_income_vs_expenses(
    db: Session, user: User, month: str | None = None
) -> IncomeVsExpensesRead:
    period, start, end_exclusive = _period_range(month)
    # Misma consulta agregada que usa el resumen.
    totals = statistics_repository.transaction_totals(db, user.id, start, end_exclusive)
    return IncomeVsExpensesRead(
        period=period,
        income=_money(totals.income),
        expenses=_money(totals.expenses),
        net=_money(totals.income - totals.expenses),
    )
