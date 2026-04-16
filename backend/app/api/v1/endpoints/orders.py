from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.cart import CartItemAdd, CartRead
from app.schemas.order import CheckoutRequest, OrderRead
from app.services.order_service import OrderService

router = APIRouter()


@router.get("/cart", response_model=CartRead)
async def get_cart(db: DbSession, current_user: CurrentUser) -> CartRead:
    service = OrderService(db)
    cart = await service.get_cart(UUID(str(current_user.id)))
    return CartRead.model_validate(cart)


@router.post("/cart/items", response_model=CartRead)
async def add_cart_item(payload: CartItemAdd, db: DbSession, current_user: CurrentUser) -> CartRead:
    service = OrderService(db)
    cart = await service.add_to_cart(
        user_id=UUID(str(current_user.id)),
        product_id=UUID(payload.product_id),
        quantity=payload.quantity,
    )
    return CartRead.model_validate(cart)


@router.delete("/cart/items/{product_id}", response_model=CartRead)
async def remove_cart_item(product_id: UUID, db: DbSession, current_user: CurrentUser) -> CartRead:
    service = OrderService(db)
    cart = await service.remove_from_cart(UUID(str(current_user.id)), product_id)
    return CartRead.model_validate(cart)


@router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def checkout(payload: CheckoutRequest, db: DbSession, current_user: CurrentUser) -> OrderRead:
    service = OrderService(db)
    order = await service.checkout(
        user_id=UUID(str(current_user.id)),
        shipping_address=payload.shipping_address,
    )
    return OrderRead.model_validate(order)


@router.get("", response_model=list[OrderRead])
async def list_orders(db: DbSession, current_user: CurrentUser) -> list[OrderRead]:
    service = OrderService(db)
    orders = await service.list_orders(UUID(str(current_user.id)))
    return [OrderRead.model_validate(order) for order in orders]


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(order_id: UUID, db: DbSession, current_user: CurrentUser) -> OrderRead:
    service = OrderService(db)
    order = await service.get_order(UUID(str(current_user.id)), order_id)
    return OrderRead.model_validate(order)
