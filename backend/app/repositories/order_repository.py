from collections.abc import Sequence
from decimal import Decimal
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cart import Cart
from app.models.order import Order, OrderItem


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_order_from_cart(
        self, user_id: UUID, cart: Cart, shipping_address: str
    ) -> Order:
        total = sum((item.unit_price * item.quantity for item in cart.items), Decimal("0"))
        order = Order(
            user_id=user_id,
            total_amount=total,
            shipping_address=shipping_address,
        )
        self.session.add(order)
        await self.session.flush()

        for item in cart.items:
            self.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                )
            )

        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def list_orders_for_user(self, user_id: UUID) -> Sequence[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.user_id == user_id)
            .order_by(desc(Order.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_order(self, order_id: UUID) -> Order | None:
        stmt = (
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.payment))
            .where(Order.id == order_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders(self, skip: int = 0, limit: int = 50) -> Sequence[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.user))
            .order_by(desc(Order.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
