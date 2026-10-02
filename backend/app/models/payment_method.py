from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func

from app.database.connection import Base

PAYMENT_METHOD_TYPES = ("efectivo", "tarjeta", "transferencia", "qr", "billetera_digital")


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True)
    # NULL = método del sistema, visible para todos y no editable.
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name = Column(String(50), nullable=False)
    type = Column(String(20), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @property
    def is_system(self) -> bool:
        return self.user_id is None
