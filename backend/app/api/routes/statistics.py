from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_active_user
from app.database.connection import get_db
from app.models import User
from app.schemas.statistics import SummaryRead
from app.services import statistics_service

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/summary", response_model=SummaryRead)
def get_summary(
    month: str | None = Query(
        default=None,
        description="Mes en formato YYYY-MM. Si se omite, el mes actual.",
        examples=["2026-10"],
    ),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return statistics_service.get_summary(db, user, month)
