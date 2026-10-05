from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    month: str | None = Query(
        default=None,
        description="Mes en formato YYYY-MM. Si se omite, el mes actual.",
        examples=["2026-10"],
    ),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return budget_service.list_budgets(db, user, month)


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return budget_service.create_budget(db, user, data)


@router.get("/{budget_id}", response_model=BudgetRead)
def get_budget(
    budget_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return budget_service.get_budget(db, user, budget_id)


@router.put("/{budget_id}", response_model=BudgetRead)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return budget_service.update_budget(db, user, budget_id, data)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    budget_service.delete_budget(db, user, budget_id)
