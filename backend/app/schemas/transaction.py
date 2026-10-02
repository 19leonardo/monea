import datetime as dt
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

TransactionType = Literal["INGRESO", "GASTO"]
# Siempre positivo: el signo lo da `type`.
PositiveAmount = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class TransactionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    account_id: int
    category_id: int
    payment_method_id: int | None = None
    type: TransactionType
    amount: PositiveAmount
    description: str | None = Field(default=None, max_length=255)
    date: dt.date


class TransactionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    account_id: int | None = None
    category_id: int | None = None
    # Enviar null explícitamente quita el método de pago.
    payment_method_id: int | None = None
    type: TransactionType | None = None
    amount: PositiveAmount | None = None
    description: str | None = Field(default=None, max_length=255)
    date: dt.date | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    account_name: str
    category_id: int
    category_name: str
    category_icon: str
    payment_method_id: int | None
    payment_method_name: str | None
    type: TransactionType
    amount: Decimal
    description: str | None
    date: dt.date
    created_at: dt.datetime
