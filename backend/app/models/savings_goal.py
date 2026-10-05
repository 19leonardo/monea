from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database.connection import Base

GOAL_STATUSES = ("activa", "completada", "cancelada")


class SavingsGoal(Base):
    """Meta de ahorro. Lo ahorrado SÍ se guarda (current_amount) y se actualiza con cada aporte."""

    __tablename__ = "savings_goals"
    __table_args__ = (
        CheckConstraint("target_amount > 0", name="ck_savings_goals_target_positive"),
        CheckConstraint("current_amount >= 0", name="ck_savings_goals_current_non_negative"),
        CheckConstraint(
            "status IN ('activa', 'completada', 'cancelada')", name="ck_savings_goals_status"
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    target_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="activa", server_default="activa")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    contributions = relationship(
        "GoalContribution",
        back_populates="goal",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class GoalContribution(Base):
    """Aporte a una meta: historial de cuánto y cuándo se ahorró."""

    __tablename__ = "goal_contributions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_goal_contributions_amount_positive"),
    )

    id = Column(Integer, primary_key=True)
    goal_id = Column(
        Integer, ForeignKey("savings_goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    goal = relationship("SavingsGoal", back_populates="contributions")
