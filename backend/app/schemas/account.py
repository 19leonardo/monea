from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

AccountType = Literal[
    "efectivo",
    "cuenta_bancaria",
    "tarjeta_debito",
    "tarjeta_credito",
    "billetera_digital",
]
Money = Annotated[Decimal, Field(max_digits=12, decimal_places=2)]
CurrencyCode = Annotated[str, Field(pattern=r"^[A-Z]{3}$", examples=["BOB"])]


class AccountCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    type: AccountType
    # Puede ser negativo (p. ej. deuda inicial de una tarjeta de crédito).
    initial_balance: Money = Decimal("0")
    currency: CurrencyCode = "BOB"


class AccountUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: AccountType | None = None
    initial_balance: Money | None = None
    currency: CurrencyCode | None = None
    is_active: bool | None = None


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: AccountType
    initial_balance: Decimal
    balance: Decimal
    currency: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
