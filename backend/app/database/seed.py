from app.database.connection import SessionLocal
from app.models import Role

DEFAULT_ROLES = ("user", "admin")


def seed_roles() -> None:
    db = SessionLocal()
    try:
        existing = {name for (name,) in db.query(Role.name).all()}
        for name in DEFAULT_ROLES:
            if name in existing:
                print(f"Rol '{name}' ya existe, se omite.")
            else:
                db.add(Role(name=name))
                print(f"Rol '{name}' creado.")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
