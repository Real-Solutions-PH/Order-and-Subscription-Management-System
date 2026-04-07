"""Shared Pydantic schemas used across modules."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IDTimestampSchema(BaseSchema):
    id: UUID
    created_at: datetime
    updated_at: datetime


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


class PaginatedResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: list
