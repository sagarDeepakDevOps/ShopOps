from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cart import Cart, CartItem
from app.models.product import Product


class CartRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_cart(self, user_id: UUID) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .where(Cart.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_cart(self, user_id: UUID) -> Cart:
        existing = await self.get_cart(user_id)
        if existing:
            return existing

        cart = Cart(user_id=user_id)
        self.session.add(cart)
        await self.session.flush()

        # Re-load with selectinload options to avoid lazy-loading relationships
        # during response serialization in async contexts.
        loaded = await self.get_cart(user_id)
        if loaded:
            return loaded

        await self.session.refresh(cart)
        return cart

    async def get_product(self, product_id: UUID) -> Product | None:
        return await self.session.get(Product, product_id)

    async def upsert_cart_item(self, cart: Cart, product: Product, quantity: int) -> CartItem:
        stmt = select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_id == product.id
        )
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if item:
            item.quantity += quantity
        else:
            item = CartItem(
                cart_id=cart.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
            )
            self.session.add(item)

        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def remove_item(self, cart_id: UUID, product_id: UUID) -> bool:
        stmt = select(CartItem).where(
            CartItem.cart_id == cart_id, CartItem.product_id == product_id
        )
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            return False

        await self.session.delete(item)
        await self.session.flush()
        return True

    async def clear_cart(self, cart_id: UUID) -> None:
        stmt = select(CartItem).where(CartItem.cart_id == cart_id)
        result = await self.session.execute(stmt)
        for item in result.scalars().all():
            await self.session.delete(item)
        await self.session.flush()
