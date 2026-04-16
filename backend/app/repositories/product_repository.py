from collections.abc import Sequence
from decimal import Decimal
from uuid import UUID

from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.category import Category
from app.models.product import Product


class ProductRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_category(self, category: Category) -> Category:
        self.session.add(category)
        await self.session.flush()
        await self.session.refresh(category)
        return category

    async def get_category(self, category_id: UUID) -> Category | None:
        stmt = select(Category).where(Category.id == category_id, Category.is_deleted.is_(False))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_category_by_name(self, name: str) -> Category | None:
        stmt = select(Category).where(Category.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_categories(self) -> Sequence[Category]:
        stmt = select(Category).where(Category.is_deleted.is_(False)).order_by(Category.name.asc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_product(self, product: Product) -> Product:
        self.session.add(product)
        await self.session.flush()
        await self.session.refresh(product)
        return product

    async def get_product(self, product_id: UUID) -> Product | None:
        stmt = (
            select(Product)
            .options(selectinload(Product.category))
            .where(Product.id == product_id, Product.is_deleted.is_(False))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_product_by_sku(self, sku: str) -> Product | None:
        stmt = select(Product).where(Product.sku == sku)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_products(
        self,
        page: int,
        page_size: int,
        search: str | None = None,
        category_id: UUID | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[Sequence[Product], int]:
        filters: list[ColumnElement[bool]] = [Product.is_deleted.is_(False)]
        if search:
            filters.append(Product.name.ilike(f"%{search}%"))
        if category_id:
            filters.append(Product.category_id == category_id)
        if min_price is not None:
            filters.append(Product.price >= min_price)
        if max_price is not None:
            filters.append(Product.price <= max_price)

        sort_column = getattr(Product, sort_by, Product.created_at)
        order_fn = desc if sort_order.lower() == "desc" else asc

        stmt = (
            select(Product)
            .options(selectinload(Product.category))
            .where(*filters)
            .order_by(order_fn(sort_column))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        count_stmt = select(func.count(Product.id)).where(*filters)

        result = await self.session.execute(stmt)
        total = await self.session.scalar(count_stmt)
        return result.scalars().all(), int(total or 0)
