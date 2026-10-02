import jwt
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import security
from app.models import User
from app.repositories import user_repository
from app.schemas.token import Token
from app.schemas.user import PasswordChange, UserCreate, UserLogin

DEFAULT_ROLE = "user"

# Hash de relleno: se verifica contra él cuando el email no existe, para que la
# respuesta tarde lo mismo y no revele qué emails están registrados.
_DUMMY_HASH = security.hash_password("dummy-password-for-timing")


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def register(db: Session, data: UserCreate) -> User:
    email = _normalize_email(data.email)
    if user_repository.get_by_email(db, email):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="El email ya está registrado")

    role = user_repository.get_role_by_name(db, DEFAULT_ROLE)
    if role is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rol '{DEFAULT_ROLE}' no configurado; ejecuta el seed",
        )

    try:
        return user_repository.create(
            db,
            name=data.name.strip(),
            email=email,
            password_hash=security.hash_password(data.password),
            role_id=role.id,
        )
    except IntegrityError:
        # Dos registros simultáneos con el mismo email.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="El email ya está registrado")


def authenticate(db: Session, email: str, password: str) -> User:
    user = user_repository.get_by_email(db, _normalize_email(email))
    if user is None:
        security.verify_password(password, _DUMMY_HASH)
        raise _unauthorized("Email o contraseña incorrectos")
    if not security.verify_password(password, user.password_hash):
        raise _unauthorized("Email o contraseña incorrectos")
    return user


def login(db: Session, data: UserLogin) -> Token:
    user = authenticate(db, data.email, data.password)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    return Token(
        access_token=security.create_access_token(user.id),
        refresh_token=security.create_refresh_token(user.id),
    )


def refresh(db: Session, refresh_token: str) -> Token:
    try:
        payload = security.decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise _unauthorized("Refresh token inválido o expirado")
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise _unauthorized("Refresh token inválido o expirado")

    user = user_repository.get_by_id(db, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("Refresh token inválido o expirado")

    return Token(
        access_token=security.create_access_token(user.id),
        refresh_token=refresh_token,
    )


def change_password(db: Session, user: User, data: PasswordChange) -> None:
    if not security.verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="La contraseña actual es incorrecta")
    if data.current_password == data.new_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="La nueva contraseña debe ser distinta de la actual"
        )
    user_repository.update_password(db, user, security.hash_password(data.new_password))
