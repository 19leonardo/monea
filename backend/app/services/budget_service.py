from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.months import current_month, parse_month
from app.models import Budget, User
from app.repositories import budget_repository, category_repository
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate, check_threshold_order

_CENTS = Decimal("0.01")


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")


def _duplicate() -> HTTPException:
    return HTTPException(
        status.HTTP_409_CONFLICT,
        detail="Ya tienes un presupuesto para esa categoría en ese mes",
    )


# --- Cálculos ----------------------------------------------------------------

def compute_percentage(spent: Decimal, amount: Decimal) -> int:
    """round(spent / amount × 100), redondeo comercial (0.5 sube)."""
    if amount <= 0:
        # Defensivo: la BD exige amount > 0. Sin tope, cualquier gasto lo supera.
        return 100 if spent > 0 else 0
    return int((spent / amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def compute_alert_level(percentage: int, budget: Budget) -> int | None:
    """Umbral más alto superado (alcanzado): 100, 90, 70 o None."""
    for level, threshold in ((100, budget.alert_100), (90, budget.alert_90), (70, budget.alert_70)):
        if percentage >= threshold:
            return level
    return None


def to_read(budget: Budget, spent: Decimal) -> BudgetRead:
    spent = spent.quantize(_CENTS)
    percentage = compute_percentage(spent, budget.amount)
    return BudgetRead(
        id=budget.id,
        category_id=budget.category_id,
        category_name=budget.category.name,
        category_icon=budget.category.icon,
        amount=budget.amount,
        period=budget.period,
        month=budget.month,
        alert_70=budget.alert_70,
        alert_90=budget.alert_90,
        alert_100=budget.alert_100,
        created_at=budget.created_at,
        spent=spent,
        available=(budget.amount - spent).quantize(_CENTS),
        percentage=percentage,
        alert_level=compute_alert_level(percentage, budget),
    )


# --- Validaciones -------------------------------------------------------------

def _validate_category(db: Session, user: User, category_id: int) -> None:
    """Debe existir, ser del sistema o del usuario (si no -> 404) y ser de gasto (422)."""
    category = category_repository.get_by_id(db, category_id)
    if category is None or category.user_id not in (None, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    if category.type != "gasto":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"La categoría '{category.name}' es de ingreso; "
            "los presupuestos solo aplican a categorías de gasto",
        )


def _ensure_unique(
    db: Session, user: User, category_id: int, month: str, exclude_id: int | None = None
) -> None:
    if budget_repository.find_duplicate(db, user.id, category_id, month, exclude_id):
        raise _duplicate()


# --- Casos de uso -------------------------------------------------------------

def list_budgets(db: Session, user: User, month: str | None = None) -> list[BudgetRead]:
    period = month if month is not None else current_month()
    parse_month(period)  # valida el formato (422)
    rows = budget_repository.list_for_month(db, user.id, period)
    return [to_read(budget, spent) for budget, spent in rows]


def get_budget(db: Session, user: User, budget_id: int) -> BudgetRead:
    row = budget_repository.get_with_spent(db, budget_id, user.id)
    if row is None:
        raise _not_found()
    return to_read(*row)


def create_budget(db: Session, user: User, data: BudgetCreate) -> BudgetRead:
    _validate_category(db, user, data.category_id)
    _ensure_unique(db, user, data.category_id, data.month)
    try:
        budget = budget_repository.create(db, user_id=user.id, **data.model_dump())
    except IntegrityError:
        # Dos creaciones simultáneas: la restricción única de la BD tiene la última palabra.
        db.rollback()
        raise _duplicate()
    return get_budget(db, user, budget.id)


def update_budget(db: Session, user: User, budget_id: int, data: BudgetUpdate) -> BudgetRead:
    budget = budget_repository.get_by_id_for_user(db, budget_id, user.id)
    if budget is None:
        raise _not_found()

    fields = data.model_dump(exclude_unset=True, exclude_none=True)
    if not fields:
        return get_budget(db, user, budget.id)

    try:
        check_threshold_order(
            fields.get("alert_70", budget.alert_70),
            fields.get("alert_90", budget.alert_90),
            fields.get("alert_100", budget.alert_100),
        )
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))

    if "category_id" in fields:
        _validate_category(db, user, fields["category_id"])
    if "category_id" in fields or "month" in fields:
        _ensure_unique(
            db,
            user,
            fields.get("category_id", budget.category_id),
            fields.get("month", budget.month),
            exclude_id=budget.id,
        )

    try:
        budget_repository.update(db, budget, fields)
    except IntegrityError:
        db.rollback()
        raise _duplicate()
    return get_budget(db, user, budget.id)


def delete_budget(db: Session, user: User, budget_id: int) -> None:
    budget = budget_repository.get_by_id_for_user(db, budget_id, user.id)
    if budget is None:
        raise _not_found()
    budget_repository.delete(db, budget)
