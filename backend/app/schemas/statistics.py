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
