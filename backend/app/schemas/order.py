from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CheckoutRequest(BaseModel):
    shipping_address: str = Field(min_length=5, max_length=2000)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: str
    total_amount: Decimal
    currency: str
    shipping_address: str
    items: list[OrderItemRead]
    created_at: datetime
    updated_at: datetime
