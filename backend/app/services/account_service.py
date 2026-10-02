from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Account, User
from app.repositories import account_repository, transaction_repository
from app.schemas.account import AccountCreate, AccountUpdate


def list_accounts(db: Session, user: User) -> list[Account]:
    return account_repository.list_by_user(db, user.id)


def get_account(db: Session, user: User, account_id: int) -> Account:
    account = account_repository.get_by_id_for_user(db, account_id, user.id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")
    return account


def create_account(db: Session, user: User, data: AccountCreate) -> Account:
    return account_repository.create(
        db,
        user_id=user.id,
        name=data.name,
        type=data.type,
        initial_balance=data.initial_balance,
        # Una cuenta nueva no tiene movimientos: su saldo es el inicial.
        balance=data.initial_balance,
        currency=data.currency,
    )


def update_account(db: Session, user: User, account_id: int, data: AccountUpdate) -> Account:
    account = get_account(db, user, account_id)
    fields = data.model_dump(exclude_unset=True, exclude_none=True)

    # Corregir el saldo inicial desplaza el saldo actual en la misma diferencia,
    # para no perder el efecto de los movimientos ya registrados.
    # Se calcula en SQL (balance = balance + delta) para no pisar un movimiento simultáneo.
    if "initial_balance" in fields:
        fields["balance"] = Account.balance + (fields["initial_balance"] - account.initial_balance)

    if not fields:
        return account
    return account_repository.update(db, account, fields)


def delete_account(db: Session, user: User, account_id: int) -> None:
    account = get_account(db, user, account_id)
    if transaction_repository.exists_for_account(db, account.id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="La cuenta tiene movimientos; desactívala (is_active=false) en lugar de borrarla",
        )
    account_repository.delete(db, account)
