from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.core import months
from app.core.months import current_month, days_in_month, parse_month, shift_month
from app.models import User
from app.repositories import statistics_repository
from app.schemas.statistics import (
    ByCategoryRead,
    CategoryTotalRead,
    ComparisonRead,
    IncomeVsExpensesRead,
    MonthlyPoint,
    MonthlySeriesRead,
    StatisticsType,
    SummaryRead,
)

__all__ = [
    "current_month",
    "get_by_category",
    "get_comparison",
    "get_income_vs_expenses",
    "get_monthly_series",
    "get_summary",
]

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


def get_monthly_series(db: Session, user: User, count: int = 6) -> MonthlySeriesRead:
    """Últimos `count` meses (incluido el actual), del más antiguo al más reciente."""
    last = current_month()
    first = shift_month(last, -(count - 1))
    start, _ = parse_month(first)
    _, end_exclusive = parse_month(last)

    found = {
        row.month: row
        for row in statistics_repository.totals_by_month(db, user.id, start, end_exclusive)
    }
    zero = Decimal("0")
    series = []
    for offset in range(count):
        month = shift_month(first, offset)
        row = found.get(month)
        # Los meses sin movimientos van en 0: la línea del gráfico no tiene huecos.
        series.append(
            MonthlyPoint(
                month=month,
                income=_money(row.income if row else zero),
                expenses=_money(row.expenses if row else zero),
            )
        )
    return MonthlySeriesRead(series=series)


def _change_pct(current: Decimal, previous: Decimal) -> Decimal | None:
    """round((actual − anterior) / anterior × 100, 1); sin base de comparación -> None."""
    if previous == 0:
        return None
    return ((current - previous) / previous * 100).quantize(_ONE_DECIMAL, rounding=ROUND_HALF_UP)


def _elapsed_days(period: str) -> int:
    """Días transcurridos del mes: hoy si es el mes actual, todos si ya pasó, 0 si es futuro."""
    today_month = current_month()
    if period == today_month:
        return months.local_today().day
    if period < today_month:  # "YYYY-MM" se compara bien como texto
        return days_in_month(period)
    return 0


def get_comparison(db: Session, user: User, month: str | None = None) -> ComparisonRead:
    period, start, end_exclusive = _period_range(month)
    previous_period = shift_month(period, -1)
    previous_start, previous_end = parse_month(previous_period)

    current = statistics_repository.transaction_totals(db, user.id, start, end_exclusive)
    previous = statistics_repository.transaction_totals(
        db, user.id, previous_start, previous_end
    )

    days = _elapsed_days(period)
    daily_avg = (
        (current.expenses / days).quantize(_CENTS, rounding=ROUND_HALF_UP) if days > 0 else None
    )
    return ComparisonRead(
        period=period,
        previous_period=previous_period,
        expenses=_money(current.expenses),
        previous_expenses=_money(previous.expenses),
        expenses_change_pct=_change_pct(current.expenses, previous.expenses),
        income=_money(current.income),
        previous_income=_money(previous.income),
        income_change_pct=_change_pct(current.income, previous.income),
        daily_avg_expense=daily_avg,
    )
