from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, func

from app.database.connection import Base

ACCOUNT_TYPES = (
    "efectivo",
    "cuenta_bancaria",
    "tarjeta_debito",
    "tarjeta_credito",
    "billetera_digital",
)


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False)
    type = Column(String(30), nullable=False)
    initial_balance = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    balance = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    currency = Column(String(3), nullable=False, default="BOB", server_default="BOB")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
