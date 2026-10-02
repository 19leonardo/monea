from sqlalchemy.orm import Session

from app.models import Role, User


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_role_by_name(db: Session, name: str) -> Role | None:
    return db.query(Role).filter(Role.name == name).first()


def create(db: Session, *, name: str, email: str, password_hash: str, role_id: int) -> User:
    user = User(name=name, email=email, password_hash=password_hash, role_id=role_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_password(db: Session, user: User, password_hash: str) -> User:
    user.password_hash = password_hash
    db.commit()
    db.refresh(user)
    return user
