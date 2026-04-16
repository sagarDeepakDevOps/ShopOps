from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryRead


class ProductCreate(BaseModel):
    category_id: str | None = None
    sku: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=0)
    stock: int = Field(ge=0)


class ProductUpdate(BaseModel):
    category_id: str | None = None
    sku: str | None = Field(default=None, min_length=2, max_length=80)
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID | None
    sku: str
    name: str
    description: str | None
    price: Decimal
    stock: int
    category: CategoryRead | None = None
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    items: list[ProductRead]
    page: int
    page_size: int
    total: int
