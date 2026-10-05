from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database.connection import Base


class Budget(Base):
    """
    Tope de gasto de una categoría en un mes. Lo gastado NO se guarda: se calcula
    a partir de las transacciones (ver budget_repository).
    """

    __tablename__ = "budgets"
    __table_args__ = (
        # Un solo presupuesto por categoría y mes para cada usuario.
        UniqueConstraint("user_id", "category_id", "month", name="uq_budgets_user_category_month"),
        CheckConstraint("amount > 0", name="ck_budgets_amount_positive"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Si el usuario borra una categoría propia, sus presupuestos se van con ella.
    category_id = Column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount = Column(Numeric(12, 2), nullable=False)
    period = Column(String(20), nullable=False, default="mensual", server_default="mensual")
    month = Column(String(7), nullable=False)  # "YYYY-MM"
    alert_70 = Column(Integer, nullable=False, default=70, server_default="70")
    alert_90 = Column(Integer, nullable=False, default=90, server_default="90")
    alert_100 = Column(Integer, nullable=False, default=100, server_default="100")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    category = relationship("Category")
