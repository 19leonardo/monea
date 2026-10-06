from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class SummaryRead(BaseModel):
    """Resumen del dashboard. Los montos se serializan como texto decimal ("1500.50")."""

    period: str = Field(examples=["2026-10"], description="Mes del resumen (YYYY-MM)")
    total_balance: Decimal = Field(
        description="Suma del saldo actual de todas las cuentas (no depende del mes)"
    )
    income: Decimal = Field(description="Total de ingresos del mes")
    expenses: Decimal = Field(description="Total de gastos del mes")
    net: Decimal = Field(description="income − expenses")
    accounts_count: int
    transactions_count: int = Field(description="Movimientos del mes")


StatisticsType = Literal["gasto", "ingreso"]


class CategoryTotalRead(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    total: Decimal
    percentage: Decimal = Field(description="% sobre el total del período, 1 decimal")


class ByCategoryRead(BaseModel):
    """Movimientos de un tipo agrupados por categoría (para el gráfico de torta)."""

    period: str = Field(examples=["2026-10"])
    type: StatisticsType
    total: Decimal = Field(description="Suma de todas las categorías del período")
    items: list[CategoryTotalRead] = Field(description="De mayor a menor total")


class IncomeVsExpensesRead(BaseModel):
    period: str = Field(examples=["2026-10"])
    income: Decimal
    expenses: Decimal
    net: Decimal = Field(description="income − expenses")


class MonthlyPoint(BaseModel):
    month: str = Field(examples=["2026-10"])
    income: Decimal
    expenses: Decimal


class MonthlySeriesRead(BaseModel):
    """Últimos N meses, del más antiguo al más reciente; los meses vacíos van en 0."""

    series: list[MonthlyPoint]


class ComparisonRead(BaseModel):
    """Mes elegido contra el anterior."""

    period: str = Field(examples=["2026-10"])
    previous_period: str = Field(examples=["2026-09"])
    expenses: Decimal
    previous_expenses: Decimal
    expenses_change_pct: Decimal | None = Field(
        description="% de cambio vs. el mes anterior, 1 decimal; null si el anterior fue 0"
    )
    income: Decimal
    previous_income: Decimal
    income_change_pct: Decimal | None = Field(
        description="% de cambio vs. el mes anterior, 1 decimal; null si el anterior fue 0"
    )
    daily_avg_expense: Decimal | None = Field(
        description="Gasto del mes / días transcurridos (null si el mes aún no empezó)"
    )
