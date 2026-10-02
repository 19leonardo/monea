from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.account import AccountCreate, AccountRead, AccountUpdate
from app.services import account_service

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountRead])
def list_accounts(
    user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    return account_service.list_accounts(db, user)


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    data: AccountCreate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return account_service.create_account(db, user, data)


@router.get("/{account_id}", response_model=AccountRead)
def get_account(
    account_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return account_service.get_account(db, user, account_id)


@router.put("/{account_id}", response_model=AccountRead)
def update_account(
    account_id: int,
    data: AccountUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return account_service.update_account(db, user, account_id, data)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    account_service.delete_account(db, user, account_id)
