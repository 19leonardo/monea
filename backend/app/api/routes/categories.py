from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryType, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(
    category_type: CategoryType | None = Query(
        default=None, alias="type", description="Filtrar por gasto o ingreso"
    ),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return category_service.list_categories(db, user, category_type)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return category_service.create_category(db, user, data)


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return category_service.update_category(db, user, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    category_service.delete_category(db, user, category_id)
