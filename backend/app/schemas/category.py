from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CategoryType = Literal["gasto", "ingreso"]


class CategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=50)
    # Nombre de un icono de Material Design Icons (p. ej. "food", "bus").
    icon: str = Field(default="tag", min_length=1, max_length=50)
    type: CategoryType


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=50)
    icon: str | None = Field(default=None, min_length=1, max_length=50)
    type: CategoryType | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str
    type: CategoryType
    is_default: bool
    is_system: bool
    created_at: datetime
