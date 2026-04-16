from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User


class AdminRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def dashboard_counts(self) -> dict[str, int]:
        total_users = await self.session.scalar(
            select(func.count(User.id)).where(User.is_deleted.is_(False))
        )
        total_products = await self.session.scalar(
            select(func.count(Product.id)).where(Product.is_deleted.is_(False))
        )
        total_orders = await self.session.scalar(select(func.count(Order.id)))
        pending_orders = await self.session.scalar(
            select(func.count(Order.id)).where(Order.status == OrderStatus.PENDING)
        )
        paid_orders = await self.session.scalar(
            select(func.count(Order.id)).where(Order.status == OrderStatus.PAID)
        )

        return {
            "total_users": int(total_users or 0),
            "total_products": int(total_products or 0),
            "total_orders": int(total_orders or 0),
            "pending_orders": int(pending_orders or 0),
            "paid_orders": int(paid_orders or 0),
        }
