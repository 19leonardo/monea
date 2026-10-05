import datetime as dt
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.core.months import MONTH_REGEX

BudgetPeriod = Literal["mensual"]
PositiveAmount = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
Month = Annotated[str, Field(pattern=MONTH_REGEX, examples=["2026-10"])]
Threshold = Annotated[int, Field(ge=1, le=1000, description="Porcentaje del tope")]
# Nivel de alerta: qué umbral se superó (70 = primer aviso, 90 = segundo, 100 = tope).
AlertLevel = Literal[70, 90, 100]


def check_threshold_order(alert_70: int, alert_90: int, alert_100: int) -> None:
    if not alert_70 < alert_90 < alert_100:
        raise ValueError("Los umbrales deben ser crecientes: alert_70 < alert_90 < alert_100")


class BudgetCreate(BaseModel):
    category_id: int
    amount: PositiveAmount
    month: Month
    period: BudgetPeriod = "mensual"
    alert_70: Threshold = 70
    alert_90: Threshold = 90
    alert_100: Threshold = 100

    @model_validator(mode="after")
    def _thresholds_in_order(self) -> Self:
        check_threshold_order(self.alert_70, self.alert_90, self.alert_100)
        return self


class BudgetUpdate(BaseModel):
    """Actualización parcial. El orden de los umbrales se valida en el servicio
    contra los valores ya guardados."""

    category_id: int | None = None
    amount: PositiveAmount | None = None
    month: Month | None = None
    alert_70: Threshold | None = None
    alert_90: Threshold | None = None
    alert_100: Threshold | None = None


class BudgetRead(BaseModel):
    id: int
    category_id: int
    category_name: str
    category_icon: str
    amount: Decimal
    period: BudgetPeriod
    month: str
    alert_70: int
    alert_90: int
    alert_100: int
    created_at: dt.datetime
    # Calculados (no se guardan):
    spent: Decimal = Field(description="Gastos de la categoría en el mes")
    available: Decimal = Field(description="amount − spent (negativo si se pasó del tope)")
    percentage: int = Field(description="round(spent / amount × 100)")
    alert_level: AlertLevel | None = Field(
        description="Umbral más alto superado: 70, 90, 100 o null"
    )
