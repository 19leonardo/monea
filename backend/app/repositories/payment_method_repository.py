from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import PaymentMethod


def list_visible(db: Session, user_id: int) -> list[PaymentMethod]:
    """Métodos de pago del sistema (user_id NULL) más los del usuario."""
    return (
        db.query(PaymentMethod)
        .filter(or_(PaymentMethod.user_id.is_(None), PaymentMethod.user_id == user_id))
        .order_by(PaymentMethod.user_id.is_not(None), PaymentMethod.id)
        .all()
    )


def get_by_id(db: Session, method_id: int) -> PaymentMethod | None:
    return db.get(PaymentMethod, method_id)


def find_visible_by_name(
    db: Session, user_id: int, name: str, exclude_id: int | None = None
) -> PaymentMethod | None:
    query = db.query(PaymentMethod).filter(
        or_(PaymentMethod.user_id.is_(None), PaymentMethod.user_id == user_id),
        func.lower(PaymentMethod.name) == name.lower(),
    )
    if exclude_id is not None:
        query = query.filter(PaymentMethod.id != exclude_id)
    return query.first()


def create(db: Session, *, user_id: int | None, **fields: Any) -> PaymentMethod:
    method = PaymentMethod(user_id=user_id, **fields)
    db.add(method)
    db.commit()
    db.refresh(method)
    return method


def update(db: Session, method: PaymentMethod, fields: dict[str, Any]) -> PaymentMethod:
    for key, value in fields.items():
        setattr(method, key, value)
    db.commit()
    db.refresh(method)
    return method


def delete(db: Session, method: PaymentMethod) -> None:
    db.delete(method)
    db.commit()
