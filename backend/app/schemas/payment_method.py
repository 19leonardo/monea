from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PaymentMethodType = Literal["efectivo", "tarjeta", "transferencia", "qr", "billetera_digital"]


class PaymentMethodCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=50)
    type: PaymentMethodType


class PaymentMethodUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=50)
    type: PaymentMethodType | None = None


class PaymentMethodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: PaymentMethodType
    is_default: bool
    is_system: bool
    created_at: datetime
