from datetime import datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator

# bcrypt solo procesa los primeros 72 bytes: se rechazan contraseñas más largas
# (medidas en bytes UTF-8, no en caracteres) para que no se trunquen en silencio.
PASSWORD_MAX_BYTES = 72


def _check_password_bytes(value: str) -> str:
    if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError(f"La contraseña no puede superar {PASSWORD_MAX_BYTES} bytes")
    return value


Password = Annotated[
    str, Field(min_length=8, max_length=72), AfterValidator(_check_password_bytes)
]


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: Password


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: Password


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    email: EmailStr
    currency: str
    role: str
    created_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def _role_name(cls, value: Any) -> Any:
        # Desde el ORM llega el objeto Role; se expone solo su nombre.
        return getattr(value, "name", value)
