from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.repositories.order_repository import OrderRepository
from app.repositories.payment_repository import PaymentRepository


class PaymentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.orders = OrderRepository(session)
        self.payments = PaymentRepository(session)

    async def process_mock_payment(
        self,
        order_id: UUID,
        retry: bool = False,
        force_outcome: str = "auto",
    ) -> Payment:
        order = await self.orders.get_order(order_id)
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        payment = await self.payments.get_by_order_id(order_id)
        if not payment:
            payment = await self.payments.create_pending(
                order_id=order.id,
                amount=order.total_amount,
                currency=order.currency,
            )
        elif payment.status == PaymentStatus.SUCCESS and not retry:
            return payment
        elif payment.status == PaymentStatus.FAILED and not retry:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payment previously failed. Retry with retry=true.",
            )

        if force_outcome == "success":
            is_success = True
        elif force_outcome == "failed":
            is_success = False
        elif retry and payment.status == PaymentStatus.FAILED:
            is_success = True
        else:
            is_success = int(order.id.hex[-1], 16) % 2 == 0

        payment.external_ref = f"MOCK-{order.id.hex[:12]}-{int(datetime.now(UTC).timestamp())}"

        if is_success:
            payment.status = PaymentStatus.SUCCESS
            payment.failure_reason = None
            order.status = OrderStatus.PAID
        else:
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = "Mock processor declined this transaction"
            order.status = OrderStatus.FAILED

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(payment)
        return payment
