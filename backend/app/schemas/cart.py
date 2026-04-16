from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class CartItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal
    created_at: datetime


class CartRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    items: list[CartItemRead]
    created_at: datetime
    updated_at: datetime
