from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.payment import PaymentRead
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/orders/{order_id}/process", response_model=PaymentRead)
async def process_payment(
    order_id: UUID,
    db: DbSession,
    _: CurrentUser,
    retry: bool = Query(default=False),
    force_outcome: str = Query(default="auto", pattern="^(auto|success|failed)$"),
) -> PaymentRead:
    service = PaymentService(db)
    payment = await service.process_mock_payment(order_id, retry=retry, force_outcome=force_outcome)
    return PaymentRead.model_validate(payment)
