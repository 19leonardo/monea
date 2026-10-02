from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Category, User
from app.repositories import category_repository, transaction_repository
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.ownership import ensure_editable


def _ensure_unique_name(
    db: Session, user: User, name: str, category_type: str, exclude_id: int | None = None
) -> None:
    if category_repository.find_visible_by_name(db, user.id, name, category_type, exclude_id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Ya existe una categoría de {category_type} llamada '{name}'",
        )


def list_categories(db: Session, user: User, category_type: str | None = None) -> list[Category]:
    return category_repository.list_visible(db, user.id, category_type)


def create_category(db: Session, user: User, data: CategoryCreate) -> Category:
    _ensure_unique_name(db, user, data.name, data.type)
    return category_repository.create(
        db, user_id=user.id, name=data.name, icon=data.icon, type=data.type, is_default=False
    )


def update_category(
    db: Session, user: User, category_id: int, data: CategoryUpdate
) -> Category:
    category = ensure_editable(
        category_repository.get_by_id(db, category_id), user.id, "Categoría"
    )
    fields = data.model_dump(exclude_unset=True, exclude_none=True)
    if not fields:
        return category

    if "name" in fields or "type" in fields:
        _ensure_unique_name(
            db,
            user,
            fields.get("name", category.name),
            fields.get("type", category.type),
            exclude_id=category.id,
        )
    return category_repository.update(db, category, fields)


def delete_category(db: Session, user: User, category_id: int) -> None:
    category = ensure_editable(
        category_repository.get_by_id(db, category_id), user.id, "Categoría"
    )
    if transaction_repository.exists_for_category(db, category.id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="La categoría tiene movimientos; reasígnalos antes de borrarla",
        )
    category_repository.delete(db, category)
