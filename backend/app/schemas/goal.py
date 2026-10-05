import datetime as dt
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

GoalStatus = Literal["activa", "completada", "cancelada"]
PositiveAmount = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class GoalCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    target_amount: PositiveAmount
    target_date: dt.date | None = None
    description: str | None = Field(default=None, max_length=255)


class GoalUpdate(BaseModel):
    """Actualización parcial. current_amount no se edita: cambia solo con aportes."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    target_amount: PositiveAmount | None = None
    # Enviar null explícitamente quita la fecha objetivo / la descripción.
    target_date: dt.date | None = None
    description: str | None = Field(default=None, max_length=255)
    status: GoalStatus | None = None


class GoalRead(BaseModel):
    id: int
    name: str
    description: str | None
    target_amount: Decimal
    current_amount: Decimal
    target_date: dt.date | None
    status: GoalStatus
    created_at: dt.datetime
    updated_at: dt.datetime
    # Calculados (no se guardan):
    progress: Decimal = Field(description="current_amount / target_amount × 100, 2 decimales")
    remaining: Decimal = Field(description="max(target_amount − current_amount, 0)")
    recommended_monthly: Decimal | None = Field(
        description="Cuánto ahorrar por mes para llegar a target_date "
        "(null si no hay fecha, ya venció o la meta no está activa)"
    )


class ContributionCreate(BaseModel):
    amount: PositiveAmount
    # Si se omite, hoy (en la zona horaria de los usuarios).
    date: dt.date | None = None


class ContributionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    amount: Decimal
    date: dt.date
    created_at: dt.datetime
