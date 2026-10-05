"""Metas de ahorro y aportes. add_contribution no hace commit: lo decide el servicio."""
from typing import Any

from sqlalchemy.orm import Session

from app.models import GoalContribution, SavingsGoal


def list_by_user(db: Session, user_id: int, status: str | None = None) -> list[SavingsGoal]:
    query = db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id)
    if status is not None:
        query = query.filter(SavingsGoal.status == status)
    return query.order_by(SavingsGoal.created_at, SavingsGoal.id).all()


def get_by_id_for_user(db: Session, goal_id: int, user_id: int) -> SavingsGoal | None:
    return (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id)
        .first()
    )


def lock_by_id_for_user(db: Session, goal_id: int, user_id: int) -> SavingsGoal | None:
    """SELECT ... FOR UPDATE: dos aportes simultáneos no pisan current_amount."""
    return (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id)
        .with_for_update()
        .populate_existing()
        .first()
    )


def create(db: Session, *, user_id: int, **fields: Any) -> SavingsGoal:
    goal = SavingsGoal(user_id=user_id, **fields)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update(db: Session, goal: SavingsGoal, fields: dict[str, Any]) -> SavingsGoal:
    for key, value in fields.items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal


def delete(db: Session, goal: SavingsGoal) -> None:
    db.delete(goal)
    db.commit()


def add_contribution(db: Session, **fields: Any) -> GoalContribution:
    contribution = GoalContribution(**fields)
    db.add(contribution)
    db.flush()
    return contribution


def list_contributions(db: Session, goal_id: int) -> list[GoalContribution]:
    return (
        db.query(GoalContribution)
        .filter(GoalContribution.goal_id == goal_id)
        .order_by(GoalContribution.date.desc(), GoalContribution.id.desc())
        .all()
    )
