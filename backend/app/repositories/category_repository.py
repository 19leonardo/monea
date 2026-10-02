from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Category


def list_visible(db: Session, user_id: int, category_type: str | None = None) -> list[Category]:
    """Categorías del sistema (user_id NULL) más las del usuario."""
    query = db.query(Category).filter(
        or_(Category.user_id.is_(None), Category.user_id == user_id)
    )
    if category_type is not None:
        query = query.filter(Category.type == category_type)
    # Primero las del sistema, luego las propias; cada grupo por nombre.
    return query.order_by(Category.user_id.is_not(None), Category.name).all()


def get_by_id(db: Session, category_id: int) -> Category | None:
    return db.get(Category, category_id)


def find_visible_by_name(
    db: Session, user_id: int, name: str, category_type: str, exclude_id: int | None = None
) -> Category | None:
    query = db.query(Category).filter(
        or_(Category.user_id.is_(None), Category.user_id == user_id),
        func.lower(Category.name) == name.lower(),
        Category.type == category_type,
    )
    if exclude_id is not None:
        query = query.filter(Category.id != exclude_id)
    return query.first()


def create(db: Session, *, user_id: int | None, **fields: Any) -> Category:
    category = Category(user_id=user_id, **fields)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update(db: Session, category: Category, fields: dict[str, Any]) -> Category:
    for key, value in fields.items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()
