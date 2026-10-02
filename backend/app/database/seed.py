from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models import Category, PaymentMethod, Role

DEFAULT_ROLES = ("user", "admin")

# (nombre, icono de Material Design Icons)
DEFAULT_EXPENSE_CATEGORIES = (
    ("Alimentación", "food"),
    ("Transporte", "bus"),
    ("Vivienda", "home"),
    ("Educación", "school"),
    ("Salud", "medical-bag"),
    ("Entretenimiento", "movie-open"),
    ("Compras", "shopping"),
    ("Servicios", "lightning-bolt"),
    ("Otros", "dots-horizontal"),
)

DEFAULT_INCOME_CATEGORIES = (
    ("Salario", "cash"),
    ("Ventas", "storefront"),
    ("Otros ingresos", "plus-circle"),
)

# (nombre, tipo)
DEFAULT_PAYMENT_METHODS = (
    ("Efectivo", "efectivo"),
    ("Tarjeta", "tarjeta"),
    ("Transferencia", "transferencia"),
    ("QR", "qr"),
    ("Billetera digital", "billetera_digital"),
)


def seed_roles(db: Session) -> None:
    existing = {name for (name,) in db.query(Role.name).all()}
    for name in DEFAULT_ROLES:
        if name in existing:
            print(f"Rol '{name}' ya existe, se omite.")
        else:
            db.add(Role(name=name))
            print(f"Rol '{name}' creado.")


def seed_categories(db: Session) -> None:
    existing = {
        (name, type_)
        for name, type_ in db.query(Category.name, Category.type)
        .filter(Category.user_id.is_(None))
        .all()
    }
    defaults = [(name, icon, "gasto") for name, icon in DEFAULT_EXPENSE_CATEGORIES] + [
        (name, icon, "ingreso") for name, icon in DEFAULT_INCOME_CATEGORIES
    ]
    for name, icon, type_ in defaults:
        if (name, type_) in existing:
            print(f"Categoría '{name}' ({type_}) ya existe, se omite.")
        else:
            db.add(Category(user_id=None, name=name, icon=icon, type=type_, is_default=True))
            print(f"Categoría '{name}' ({type_}) creada.")


def seed_payment_methods(db: Session) -> None:
    existing = {
        name
        for (name,) in db.query(PaymentMethod.name).filter(PaymentMethod.user_id.is_(None)).all()
    }
    for name, type_ in DEFAULT_PAYMENT_METHODS:
        if name in existing:
            print(f"Método de pago '{name}' ya existe, se omite.")
        else:
            db.add(PaymentMethod(user_id=None, name=name, type=type_, is_default=True))
            print(f"Método de pago '{name}' creado.")


def run() -> None:
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_categories(db)
        seed_payment_methods(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
