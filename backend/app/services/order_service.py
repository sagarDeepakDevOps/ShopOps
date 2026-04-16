from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cart import Cart
from app.models.order import Order
from app.repositories.cart_repository import CartRepository
from app.repositories.order_repository import OrderRepository


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.cart_repo = CartRepository(session)
        self.order_repo = OrderRepository(session)

    async def get_cart(self, user_id: UUID) -> Cart:
        cart = await self.cart_repo.get_or_create_cart(user_id)
        return cart

    async def add_to_cart(self, user_id: UUID, product_id: UUID, quantity: int) -> Cart:
        cart = await self.cart_repo.get_or_create_cart(user_id)
        product = await self.cart_repo.get_product(product_id)
        if not product or product.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        if product.stock < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock"
            )

        await self.cart_repo.upsert_cart_item(cart=cart, product=product, quantity=quantity)
        await self.session.commit()
        refreshed = await self.cart_repo.get_or_create_cart(user_id)
        return refreshed

    async def remove_from_cart(self, user_id: UUID, product_id: UUID) -> Cart:
        cart = await self.cart_repo.get_or_create_cart(user_id)
        removed = await self.cart_repo.remove_item(cart.id, product_id)
        if not removed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")
        await self.session.commit()
        refreshed = await self.cart_repo.get_or_create_cart(user_id)
        return refreshed

    async def checkout(self, user_id: UUID, shipping_address: str) -> Order:
        cart = await self.cart_repo.get_or_create_cart(user_id)
        if not cart.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

        for item in cart.items:
            if item.product.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for product {item.product_id}",
                )

        order = await self.order_repo.create_order_from_cart(
            user_id=user_id,
            cart=cart,
            shipping_address=shipping_address,
        )

        for item in cart.items:
            item.product.stock -= item.quantity

        await self.cart_repo.clear_cart(cart.id)
        await self.session.commit()
        saved = await self.order_repo.get_order(order.id)
        if not saved:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order not saved"
            )
        return saved

    async def list_orders(self, user_id: UUID) -> list[Order]:
        return list(await self.order_repo.list_orders_for_user(user_id))

    async def get_order(self, user_id: UUID, order_id: UUID) -> Order:
        order = await self.order_repo.get_order(order_id)
        if not order or order.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return order

    async def calculate_cart_total(self, user_id: UUID) -> Decimal:
        cart = await self.cart_repo.get_or_create_cart(user_id)
        return sum((item.unit_price * item.quantity for item in cart.items), Decimal("0"))
