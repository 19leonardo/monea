from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.statistics import (
    ByCategoryRead,
    ComparisonRead,
    IncomeVsExpensesRead,
    MonthlySeriesRead,
    StatisticsType,
    SummaryRead,
)
from app.services import statistics_service

router = APIRouter(prefix="/statistics", tags=["statistics"])

_MONTH_QUERY = Query(
    default=None,
    description="Mes en formato YYYY-MM. Si se omite, el mes actual.",
    examples=["2026-10"],
)


@router.get("/summary", response_model=SummaryRead)
def get_summary(
    month: str | None = _MONTH_QUERY,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return statistics_service.get_summary(db, user, month)


@router.get("/by-category", response_model=ByCategoryRead)
def get_by_category(
    month: str | None = _MONTH_QUERY,
    category_type: StatisticsType = Query(
        default="gasto", alias="type", description="gasto o ingreso"
    ),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Totales por categoría del mes, de mayor a menor, con su porcentaje."""
    return statistics_service.get_by_category(db, user, month, category_type)


@router.get("/income-vs-expenses", response_model=IncomeVsExpensesRead)
def get_income_vs_expenses(
    month: str | None = _MONTH_QUERY,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Ingresos, gastos y balance del mes."""
    return statistics_service.get_income_vs_expenses(db, user, month)


@router.get("/monthly", response_model=MonthlySeriesRead)
def get_monthly_series(
    months: int = Query(default=6, ge=1, le=24, description="Cantidad de meses (1 a 24)"),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Ingresos y gastos de los últimos N meses (incluido el actual), del más antiguo al más reciente."""
    return statistics_service.get_monthly_series(db, user, months)


@router.get("/comparison", response_model=ComparisonRead)
def get_comparison(
    month: str | None = _MONTH_QUERY,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """El mes elegido contra el anterior: % de cambio y gasto diario promedio."""
    return statistics_service.get_comparison(db, user, month)
