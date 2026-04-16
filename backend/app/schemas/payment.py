from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    status: str
    provider: str
    amount: Decimal
    currency: str
    external_ref: str | None
    failure_reason: str | None
    created_at: datetime
    updated_at: datetime


class PaymentProcessRequest(BaseModel):
    retry: bool = False
    force_outcome: str = "auto"
