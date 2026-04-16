from uuid import UUID

from fastapi import APIRouter

from app.api.deps import AdminUser, DbSession
from app.schemas.admin import AdminDashboard, AdminOrderStatusUpdate
from app.schemas.order import OrderRead
from app.schemas.user import UserRead
from app.services.admin_service import AdminService

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboard)
async def get_dashboard(db: DbSession, _: AdminUser) -> AdminDashboard:
    service = AdminService(db)
    dashboard = await service.dashboard()
    return AdminDashboard.model_validate(dashboard)


@router.get("/users", response_model=list[UserRead])
async def list_users(db: DbSession, _: AdminUser, skip: int = 0, limit: int = 50) -> list[UserRead]:
    service = AdminService(db)
    users = await service.list_users(skip=skip, limit=limit)
    return [UserRead.model_validate(user) for user in users]


@router.patch("/users/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(user_id: UUID, db: DbSession, _: AdminUser) -> UserRead:
    service = AdminService(db)
    user = await service.deactivate_user(user_id)
    return UserRead.model_validate(user)


@router.get("/orders", response_model=list[OrderRead])
async def list_orders(
    db: DbSession, _: AdminUser, skip: int = 0, limit: int = 50
) -> list[OrderRead]:
    service = AdminService(db)
    orders = await service.list_orders(skip=skip, limit=limit)
    return [OrderRead.model_validate(order) for order in orders]


@router.patch("/orders/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: UUID,
    payload: AdminOrderStatusUpdate,
    db: DbSession,
    _: AdminUser,
) -> OrderRead:
    service = AdminService(db)
    order = await service.update_order_status(order_id, payload.status)
    return OrderRead.model_validate(order)
