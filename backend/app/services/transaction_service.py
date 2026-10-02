"""
Movimientos y saldos. Cada operación que toca un saldo es atómica: el movimiento y
el ajuste de account.balance se confirman juntos (commit) o no se aplica nada (rollback).
"""
from collections.abc import Iterator
from contextlib import contextmanager
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import DataError
from sqlalchemy.orm import Session

from app.models import Account, Transaction, User
from app.repositories import (
    category_repository,
    payment_method_repository,
    transaction_repository,
)
from app.repositories.transaction_repository import TransactionFilters
from app.schemas.transaction import TransactionCreate, TransactionUpdate

# Tipo de movimiento -> tipo de categoría que le corresponde.
CATEGORY_TYPE_FOR = {"INGRESO": "ingreso", "GASTO": "gasto"}


@contextmanager
def _atomic(db: Session) -> Iterator[None]:
    """Commit al terminar; rollback ante cualquier error, para que el saldo no cambie."""
    try:
        yield
        db.commit()
    except DataError:
        db.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El saldo resultante supera el máximo permitido para la cuenta",
        )
    except Exception:
        db.rollback()
        raise


def _effect(transaction_type: str, amount: Decimal) -> Decimal:
    """Cuánto cambia el saldo de la cuenta: +monto si es ingreso, −monto si es gasto."""
    return amount if transaction_type == "INGRESO" else -amount


def _not_found(label: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail=f"{label} no encontrado")


def _validate_references(
    db: Session,
    user: User,
    *,
    category_id: int,
    payment_method_id: int | None,
    transaction_type: str,
) -> None:
    """La categoría y el método deben ser del sistema o del usuario; si no -> 404."""
    category = category_repository.get_by_id(db, category_id)
    if category is None or category.user_id not in (None, user.id):
        raise _not_found("Categoría")
    if category.type != CATEGORY_TYPE_FOR[transaction_type]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"La categoría '{category.name}' es de {category.type}, "
            f"no corresponde a un {transaction_type.lower()}",
        )

    if payment_method_id is not None:
        method = payment_method_repository.get_by_id(db, payment_method_id)
        if method is None or method.user_id not in (None, user.id):
            raise _not_found("Método de pago")


def _lock_account(db: Session, user: User, account_id: int) -> Account:
    account = transaction_repository.lock_accounts(db, {account_id}, user.id).get(account_id)
    if account is None:
        raise _not_found("Cuenta")
    return account


def _get_transaction(db: Session, user: User, transaction_id: int) -> Transaction:
    transaction = transaction_repository.get_by_id_for_user(db, transaction_id, user.id)
    if transaction is None:
        raise _not_found("Movimiento")
    return transaction


def _lock_transaction(db: Session, user: User, transaction_id: int) -> Transaction:
    transaction = transaction_repository.lock_by_id_for_user(db, transaction_id, user.id)
    if transaction is None:
        raise _not_found("Movimiento")
    return transaction


def list_transactions(
    db: Session, user: User, filters: TransactionFilters, limit: int, offset: int
) -> list[Transaction]:
    return transaction_repository.list_by_user(db, user.id, filters, limit, offset)


def get_transaction(db: Session, user: User, transaction_id: int) -> Transaction:
    return _get_transaction(db, user, transaction_id)


def create_transaction(db: Session, user: User, data: TransactionCreate) -> Transaction:
    with _atomic(db):
        account = _lock_account(db, user, data.account_id)
        if not account.is_active:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, detail="La cuenta está desactivada"
            )
        _validate_references(
            db,
            user,
            category_id=data.category_id,
            payment_method_id=data.payment_method_id,
            transaction_type=data.type,
        )

        transaction = transaction_repository.add(
            db,
            user_id=user.id,
            account_id=account.id,
            category_id=data.category_id,
            payment_method_id=data.payment_method_id,
            type=data.type,
            amount=data.amount,
            description=data.description or None,
            date=data.date,
        )
        account.balance = account.balance + _effect(data.type, data.amount)

    return _get_transaction(db, user, transaction.id)


def update_transaction(
    db: Session, user: User, transaction_id: int, data: TransactionUpdate
) -> Transaction:
    changes = data.model_dump(exclude_unset=True)
    # Salvo payment_method_id (null = quitarlo) y description, un null no cambia nada.
    changes = {
        key: value
        for key, value in changes.items()
        if value is not None or key in ("payment_method_id", "description")
    }

    with _atomic(db):
        transaction = _lock_transaction(db, user, transaction_id)
        old_account_id = transaction.account_id
        old_effect = _effect(transaction.type, transaction.amount)

        new_account_id = changes.get("account_id", old_account_id)
        new_type = changes.get("type", transaction.type)
        new_amount = changes.get("amount", transaction.amount)

        # Se bloquean la cuenta anterior y la nueva (si cambia) antes de tocar saldos.
        accounts = transaction_repository.lock_accounts(
            db, {old_account_id, new_account_id}, user.id
        )
        if new_account_id not in accounts:
            raise _not_found("Cuenta")
        if new_account_id != old_account_id and not accounts[new_account_id].is_active:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, detail="La cuenta está desactivada"
            )

        if {"category_id", "type", "payment_method_id"} & changes.keys():
            _validate_references(
                db,
                user,
                category_id=changes.get("category_id", transaction.category_id),
                payment_method_id=changes.get("payment_method_id", transaction.payment_method_id),
                transaction_type=new_type,
            )

        # 1) Revertir el efecto anterior sobre su cuenta. 2) Aplicar el nuevo.
        accounts[old_account_id].balance = accounts[old_account_id].balance - old_effect
        accounts[new_account_id].balance = accounts[new_account_id].balance + _effect(
            new_type, new_amount
        )

        if "description" in changes:
            changes["description"] = changes["description"] or None
        for key, value in changes.items():
            setattr(transaction, key, value)

    db.expire_all()
    return _get_transaction(db, user, transaction_id)


def delete_transaction(db: Session, user: User, transaction_id: int) -> None:
    with _atomic(db):
        transaction = _lock_transaction(db, user, transaction_id)
        account = _lock_account(db, user, transaction.account_id)
        account.balance = account.balance - _effect(transaction.type, transaction.amount)
        transaction_repository.delete(db, transaction)


def recalculate_balance(db: Session, user: User, account_id: int) -> Account:
    """balance = initial_balance + Σ ingresos − Σ gastos (corrige cualquier desajuste)."""
    with _atomic(db):
        account = _lock_account(db, user, account_id)
        account.balance = account.initial_balance + transaction_repository.sum_effect_for_account(
            db, account.id
        )
    db.refresh(account)
    return account
