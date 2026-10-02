import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.repositories.transaction_repository import TransactionFilters
from app.schemas.transaction import (
    TransactionCreate,
    TransactionRead,
    TransactionType,
    TransactionUpdate,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    start_date: dt.date | None = Query(default=None, description="Desde (inclusive)"),
    end_date: dt.date | None = Query(default=None, description="Hasta (inclusive)"),
    transaction_type: TransactionType | None = Query(default=None, alias="type"),
    account_id: int | None = None,
    category_id: int | None = None,
    payment_method_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="start_date no puede ser posterior a end_date",
        )
    filters = TransactionFilters(
        start_date=start_date,
        end_date=end_date,
        type=transaction_type,
        account_id=account_id,
        category_id=category_id,
        payment_method_id=payment_method_id,
    )
    return transaction_service.list_transactions(db, user, filters, limit, offset)


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return transaction_service.create_transaction(db, user, data)


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(
    transaction_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return transaction_service.get_transaction(db, user, transaction_id)


@router.put("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return transaction_service.update_transaction(db, user, transaction_id, data)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    transaction_service.delete_transaction(db, user, transaction_id)
