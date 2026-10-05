from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.goal import (
    ContributionCreate,
    ContributionRead,
    GoalCreate,
    GoalRead,
    GoalStatus,
    GoalUpdate,
)
from app.services import goal_service

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalRead])
def list_goals(
    goal_status: GoalStatus | None = Query(
        default=None, alias="status", description="Filtrar por estado"
    ),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return goal_service.list_goals(db, user, goal_status)


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return goal_service.create_goal(db, user, data)


@router.get("/{goal_id}", response_model=GoalRead)
def get_goal(
    goal_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return goal_service.get_goal(db, user, goal_id)


@router.put("/{goal_id}", response_model=GoalRead)
def update_goal(
    goal_id: int,
    data: GoalUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return goal_service.update_goal(db, user, goal_id, data)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    goal_service.delete_goal(db, user, goal_id)


@router.post(
    "/{goal_id}/contributions",
    response_model=GoalRead,
    status_code=status.HTTP_201_CREATED,
    summary="Aportar a una meta",
    description="Registra el aporte y lo suma a current_amount de forma atómica. "
    "Devuelve la meta actualizada.",
)
def add_contribution(
    goal_id: int,
    data: ContributionCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return goal_service.add_contribution(db, user, goal_id, data)


@router.get("/{goal_id}/contributions", response_model=list[ContributionRead])
def list_contributions(
    goal_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return goal_service.list_contributions(db, user, goal_id)
