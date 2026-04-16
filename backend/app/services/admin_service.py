from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus
from app.models.user import User
from app.repositories.admin_repository import AdminRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.user_repository import UserRepository


class AdminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.admin_repo = AdminRepository(session)
        self.user_repo = UserRepository(session)
        self.order_repo = OrderRepository(session)

    async def dashboard(self) -> dict[str, int]:
        return await self.admin_repo.dashboard_counts()

    async def list_users(self, skip: int = 0, limit: int = 50):  # type: ignore[no-untyped-def]
        return await self.user_repo.list_users(skip=skip, limit=limit)

    async def list_orders(self, skip: int = 0, limit: int = 50):  # type: ignore[no-untyped-def]
        return await self.order_repo.list_orders(skip=skip, limit=limit)

    async def deactivate_user(self, user_id: UUID) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.is_active = False
        user.soft_delete(datetime.now(UTC))
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update_order_status(self, order_id: UUID, status_value: str) -> Order:
        order = await self.order_repo.get_order(order_id)
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        try:
            normalized_status = OrderStatus(status_value)
        except ValueError as exc:
            valid_values = [state.value for state in OrderStatus]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status. Allowed values: {', '.join(valid_values)}",
            ) from exc

        order.status = normalized_status
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(order)
        return order
