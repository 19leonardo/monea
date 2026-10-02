from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database.connection import Base

TRANSACTION_TYPES = ("INGRESO", "GASTO")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        CheckConstraint("type IN ('INGRESO', 'GASTO')", name="ck_transactions_type"),
        # Listado habitual: movimientos de un usuario ordenados por fecha.
        Index("ix_transactions_user_id_date", "user_id", "date"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Sin ON DELETE: el servicio impide borrar una cuenta o categoría con movimientos.
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    payment_method_id = Column(
        Integer, ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True
    )
    type = Column(String(10), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(255), nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    account = relationship("Account")
    category = relationship("Category")
    payment_method = relationship("PaymentMethod")

    # Nombres para mostrar en el listado sin consultas extra desde el cliente.
    @property
    def account_name(self) -> str:
        return self.account.name

    @property
    def category_name(self) -> str:
        return self.category.name

    @property
    def category_icon(self) -> str:
        return self.category.icon

    @property
    def payment_method_name(self) -> str | None:
        return self.payment_method.name if self.payment_method else None
