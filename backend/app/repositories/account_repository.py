from typing import Any

from sqlalchemy.orm import Session

from app.models import Account


def list_by_user(db: Session, user_id: int) -> list[Account]:
    return (
        db.query(Account)
        .filter(Account.user_id == user_id)
        .order_by(Account.created_at, Account.id)
        .all()
    )


def get_by_id_for_user(db: Session, account_id: int, user_id: int) -> Account | None:
    return (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == user_id)
        .first()
    )


def create(db: Session, *, user_id: int, **fields: Any) -> Account:
    account = Account(user_id=user_id, **fields)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update(db: Session, account: Account, fields: dict[str, Any]) -> Account:
    for key, value in fields.items():
        setattr(account, key, value)
    db.commit()
    db.refresh(account)
    return account


def delete(db: Session, account: Account) -> None:
    db.delete(account)
    db.commit()
