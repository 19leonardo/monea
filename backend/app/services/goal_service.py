"""
Metas de ahorro. current_amount se guarda y cambia solo con aportes; el aporte y la
suma a la meta se confirman juntos (commit) o no se aplica nada (rollback).
"""
import datetime as dt
from collections.abc import Iterator
from contextlib import contextmanager
from decimal import ROUND_HALF_UP, ROUND_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import DataError
from sqlalchemy.orm import Session

from app.core import months
from app.models import GoalContribution, SavingsGoal, User
from app.repositories import goal_repository
from app.schemas.goal import ContributionCreate, GoalCreate, GoalRead, GoalUpdate

_CENTS = Decimal("0.01")


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Meta no encontrada")


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail)


@contextmanager
def _atomic(db: Session) -> Iterator[None]:
    """Commit al terminar; rollback ante cualquier error, para que la meta no cambie."""
    try:
        yield
        db.commit()
    except DataError:
        db.rollback()
        raise _unprocessable("El monto ahorrado supera el máximo permitido para la meta")
    except Exception:
        db.rollback()
        raise


# --- Cálculos ----------------------------------------------------------------

def months_left(today: dt.date, target_date: dt.date) -> int:
    """
    Meses en los que todavía se puede aportar, contando el actual:
    hoy 5-oct y objetivo 31-dic -> 3 (oct, nov, dic); objetivo 5-nov -> 1.
    """
    months_diff = (target_date.year - today.year) * 12 + (target_date.month - today.month)
    if target_date.day > today.day:
        months_diff += 1
    return max(months_diff, 1)


def compute_recommended_monthly(goal: SavingsGoal, today: dt.date) -> Decimal | None:
    """remaining / meses restantes, redondeado HACIA ARRIBA al centavo (para llegar a tiempo)."""
    if goal.status != "activa" or goal.target_date is None or goal.target_date < today:
        return None
    remaining = max(goal.target_amount - goal.current_amount, Decimal("0"))
    return (remaining / months_left(today, goal.target_date)).quantize(_CENTS, rounding=ROUND_UP)


def to_read(goal: SavingsGoal) -> GoalRead:
    target, current = goal.target_amount, goal.current_amount
    progress = (current / target * 100).quantize(_CENTS, rounding=ROUND_HALF_UP)
    return GoalRead(
        id=goal.id,
        name=goal.name,
        description=goal.description,
        target_amount=target,
        current_amount=current,
        target_date=goal.target_date,
        status=goal.status,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        progress=progress,
        remaining=max(target - current, Decimal("0")).quantize(_CENTS),
        recommended_monthly=compute_recommended_monthly(goal, months.local_today()),
    )


def _status_for_amounts(goal: SavingsGoal) -> str:
    """Una meta activa que alcanzó el objetivo se completa; una completada que deja de
    alcanzarlo (p. ej. se subió el objetivo) vuelve a activa. Cancelada se respeta."""
    if goal.status == "cancelada":
        return "cancelada"
    return "completada" if goal.current_amount >= goal.target_amount else "activa"


# --- Casos de uso -------------------------------------------------------------

def _get_goal(db: Session, user: User, goal_id: int) -> SavingsGoal:
    goal = goal_repository.get_by_id_for_user(db, goal_id, user.id)
    if goal is None:
        raise _not_found()
    return goal


def list_goals(db: Session, user: User, goal_status: str | None = None) -> list[GoalRead]:
    return [to_read(goal) for goal in goal_repository.list_by_user(db, user.id, goal_status)]


def get_goal(db: Session, user: User, goal_id: int) -> GoalRead:
    return to_read(_get_goal(db, user, goal_id))


def create_goal(db: Session, user: User, data: GoalCreate) -> GoalRead:
    if data.target_date is not None and data.target_date < months.local_today():
        raise _unprocessable("La fecha objetivo no puede estar en el pasado")
    goal = goal_repository.create(
        db,
        user_id=user.id,
        name=data.name,
        description=data.description or None,
        target_amount=data.target_amount,
        target_date=data.target_date,
    )
    return to_read(goal)


def update_goal(db: Session, user: User, goal_id: int, data: GoalUpdate) -> GoalRead:
    goal = _get_goal(db, user, goal_id)
    changes = data.model_dump(exclude_unset=True)
    # Solo target_date y description admiten null (para quitarlas).
    changes = {
        key: value
        for key, value in changes.items()
        if value is not None or key in ("target_date", "description")
    }
    if not changes:
        return to_read(goal)

    if changes.get("target_date") is not None and changes["target_date"] < months.local_today():
        raise _unprocessable("La fecha objetivo no puede estar en el pasado")
    if "description" in changes:
        changes["description"] = changes["description"] or None

    new_status = changes.pop("status", None)
    target = changes.get("target_amount", goal.target_amount)
    if new_status == "completada" and goal.current_amount < target:
        raise _unprocessable("La meta solo se completa cuando lo ahorrado alcanza el objetivo")

    for key, value in changes.items():
        setattr(goal, key, value)
    if new_status is not None:
        goal.status = new_status
    if new_status != "cancelada":
        # Recalcula completada/activa según montos (p. ej. si cambió el objetivo).
        goal.status = _status_for_amounts(goal)

    return to_read(goal_repository.update(db, goal, {}))


def delete_goal(db: Session, user: User, goal_id: int) -> None:
    goal_repository.delete(db, _get_goal(db, user, goal_id))


def add_contribution(
    db: Session, user: User, goal_id: int, data: ContributionCreate
) -> GoalRead:
    """Crea el aporte Y suma a current_amount en una sola transacción de base de datos."""
    today = months.local_today()
    contribution_date = data.date or today
    if contribution_date > today:
        raise _unprocessable("La fecha del aporte no puede estar en el futuro")

    with _atomic(db):
        goal = goal_repository.lock_by_id_for_user(db, goal_id, user.id)
        if goal is None:
            raise _not_found()
        if goal.status == "cancelada":
            raise _unprocessable("No se puede aportar a una meta cancelada")

        goal_repository.add_contribution(
            db, goal_id=goal.id, amount=data.amount, date=contribution_date
        )
        goal.current_amount = goal.current_amount + data.amount
        goal.status = _status_for_amounts(goal)

    db.refresh(goal)
    return to_read(goal)


def list_contributions(db: Session, user: User, goal_id: int) -> list[GoalContribution]:
    goal = _get_goal(db, user, goal_id)
    return goal_repository.list_contributions(db, goal.id)
