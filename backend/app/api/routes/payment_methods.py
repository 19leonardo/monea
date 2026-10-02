from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodRead,
    PaymentMethodUpdate,
)
from app.services import payment_method_service

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


@router.get("", response_model=list[PaymentMethodRead])
def list_payment_methods(
    user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    return payment_method_service.list_payment_methods(db, user)


@router.post("", response_model=PaymentMethodRead, status_code=status.HTTP_201_CREATED)
def create_payment_method(
    data: PaymentMethodCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return payment_method_service.create_payment_method(db, user, data)


@router.put("/{method_id}", response_model=PaymentMethodRead)
def update_payment_method(
    method_id: int,
    data: PaymentMethodUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return payment_method_service.update_payment_method(db, user, method_id, data)


@router.delete("/{method_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_method(
    method_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    payment_method_service.delete_payment_method(db, user, method_id)
