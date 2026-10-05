import datetime as dt
import re
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User
from app.repositories import statistics_repository
from app.schemas.statistics import SummaryRead

_MONTH_PATTERN = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")
_CENTS = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    """Siempre con 2 decimales: 0 -> 0.00, para que el JSON sea "0.00"."""
    return value.quantize(_CENTS)


def current_month() -> str:
    """Mes actual en la zona horaria de los usuarios (no en la del servidor, que es UTC)."""
    return dt.datetime.now(ZoneInfo(settings.timezone)).strftime("%Y-%m")


def parse_month(month: str) -> tuple[dt.date, dt.date]:
    """"2026-10" -> (2026-10-01, 2026-11-01): rango [inicio, fin) del mes. Formato inválido -> 422."""
    match = _MONTH_PATTERN.match(month)
    if not match:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El parámetro month debe tener el formato YYYY-MM (p. ej. 2026-10)",
        )
    year, month_number = int(match.group(1)), int(match.group(2))
    start = dt.date(year, month_number, 1)
    end_exclusive = dt.date(year + 1, 1, 1) if month_number == 12 else dt.date(year, month_number + 1, 1)
    return start, end_exclusive


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
