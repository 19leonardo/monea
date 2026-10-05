"""Meses "YYYY-MM": validación, rango de fechas y mes actual en la zona de los usuarios."""
import datetime as dt
import re
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.core.config import settings

MONTH_REGEX = r"^(\d{4})-(0[1-9]|1[0-2])$"
_MONTH_PATTERN = re.compile(MONTH_REGEX)


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
    end_exclusive = (
        dt.date(year + 1, 1, 1) if month_number == 12 else dt.date(year, month_number + 1, 1)
    )
    return start, end_exclusive
