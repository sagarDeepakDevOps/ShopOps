from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus


class PaymentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_pending(self, order_id: UUID, amount: Decimal, currency: str) -> Payment:
        payment = Payment(
            order_id=order_id, amount=amount, currency=currency, status=PaymentStatus.PENDING
        )
        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    async def get_by_order_id(self, order_id: UUID) -> Payment | None:
        stmt = select(Payment).where(Payment.order_id == order_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
