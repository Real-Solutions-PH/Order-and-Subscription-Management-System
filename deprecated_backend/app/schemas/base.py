"""Base Pydantic schemas shared across the application."""

from __future__ import annotations

import math
from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema with ORM-mode enabled."""

    model_config = ConfigDict(from_attributes=True)


class UUIDSchema(BaseSchema):
    """Mixin providing a UUID primary key field."""

    id: UUID


class TimestampSchema(BaseSchema):
    """Mixin providing created/updated timestamp fields."""

    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper.

    Attributes:
        items: The page of results.
        total: Total number of records matching the query.
        page: Current page number (1-indexed).
        page_size: Maximum items per page.
        pages: Total number of pages.
    """

    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def build(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[T]:
        """Convenience constructor that computes the page count automatically."""
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 0,
        )


class MessageResponse(BaseSchema):
    """Simple message response."""

    message: str


class ErrorResponse(BaseSchema):
    """Error detail response."""

    detail: str
