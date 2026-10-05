from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.months import current_month, parse_month
from app.models import User
from app.repositories import statistics_repository
from app.schemas.statistics import SummaryRead

__all__ = ["current_month", "get_summary"]

_CENTS = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    """Siempre con 2 decimales: 0 -> 0.00, para que el JSON sea "0.00"."""
    return value.quantize(_CENTS)


def get_summary(db: Session, user: User, month: str | None = None) -> SummaryRead:
    period = month if month is not None else current_month()
    start, end_exclusive = parse_month(period)

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
