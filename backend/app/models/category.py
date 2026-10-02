from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func

from app.database.connection import Base

CATEGORY_TYPES = ("gasto", "ingreso")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    # NULL = categoría del sistema, visible para todos y no editable.
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name = Column(String(50), nullable=False)
    icon = Column(String(50), nullable=False)
    type = Column(String(10), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @property
    def is_system(self) -> bool:
        return self.user_id is None
