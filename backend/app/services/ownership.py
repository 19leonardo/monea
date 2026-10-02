from typing import Protocol, TypeVar

from fastapi import HTTPException, status


class _Owned(Protocol):
    user_id: int | None


T = TypeVar("T", bound=_Owned)


def ensure_editable(resource: T | None, user_id: int, label: str) -> T:
    """
    Reglas para recursos que pueden ser del sistema (user_id NULL) o de un usuario:
    - no existe, o es de otro usuario -> 404 (no se revela que existe)
    - es del sistema -> 403 (se ve, pero no se puede modificar)
    """
    if resource is None or (resource.user_id is not None and resource.user_id != user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"{label} no encontrado")
    if resource.user_id is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail=f"{label} del sistema: no se puede modificar"
        )
    return resource
