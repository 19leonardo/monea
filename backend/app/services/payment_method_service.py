from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import PaymentMethod, User
from app.repositories import payment_method_repository
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate
from app.services.ownership import ensure_editable


def _ensure_unique_name(
    db: Session, user: User, name: str, exclude_id: int | None = None
) -> None:
    if payment_method_repository.find_visible_by_name(db, user.id, name, exclude_id):
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"Ya existe un método de pago llamado '{name}'"
        )


def list_payment_methods(db: Session, user: User) -> list[PaymentMethod]:
    return payment_method_repository.list_visible(db, user.id)


def create_payment_method(db: Session, user: User, data: PaymentMethodCreate) -> PaymentMethod:
    _ensure_unique_name(db, user, data.name)
    return payment_method_repository.create(
        db, user_id=user.id, name=data.name, type=data.type, is_default=False
    )


def update_payment_method(
    db: Session, user: User, method_id: int, data: PaymentMethodUpdate
) -> PaymentMethod:
    method = ensure_editable(
        payment_method_repository.get_by_id(db, method_id), user.id, "Método de pago"
    )
    fields = data.model_dump(exclude_unset=True, exclude_none=True)
    if not fields:
        return method

    if "name" in fields:
        _ensure_unique_name(db, user, fields["name"], exclude_id=method.id)
    return payment_method_repository.update(db, method, fields)


def delete_payment_method(db: Session, user: User, method_id: int) -> None:
    method = ensure_editable(
        payment_method_repository.get_by_id(db, method_id), user.id, "Método de pago"
    )
    payment_method_repository.delete(db, method)
