from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductListResponse, ProductRead, ProductUpdate


class ProductService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ProductRepository(session)

    async def create_category(self, payload: CategoryCreate) -> Category:
        existing = await self.repo.get_category_by_name(payload.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Category already exists"
            )

        category = Category(**payload.model_dump())
        await self.repo.create_category(category)
        await self.session.commit()
        return category

    async def list_categories(self) -> list[Category]:
        return list(await self.repo.list_categories())

    async def update_category(self, category_id: UUID, payload: CategoryUpdate) -> Category:
        category = await self.repo.get_category(category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        updates = payload.model_dump(exclude_unset=True)
        new_name = updates.get("name")
        if isinstance(new_name, str) and new_name != category.name:
            existing = await self.repo.get_category_by_name(new_name)
            if existing and existing.id != category.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Category already exists",
                )

        for field, value in updates.items():
            setattr(category, field, value)

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(category)
        return category

    async def create_product(self, payload: ProductCreate) -> Product:
        existing_sku = await self.repo.get_product_by_sku(payload.sku)
        if existing_sku:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")

        category_uuid = UUID(payload.category_id) if payload.category_id else None
        if category_uuid:
            category = await self.repo.get_category(category_uuid)
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
                )

        product = Product(
            category_id=category_uuid,
            sku=payload.sku,
            name=payload.name,
            description=payload.description,
            price=payload.price,
            stock=payload.stock,
        )
        await self.repo.create_product(product)
        await self.session.commit()
        created = await self.repo.get_product(product.id)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Product not saved"
            )
        return created

    async def get_product(self, product_id: UUID) -> Product:
        product = await self.repo.get_product(product_id)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return product

    async def list_products(
        self,
        page: int,
        page_size: int,
        search: str | None,
        category_id: str | None,
        min_price: Decimal | None,
        max_price: Decimal | None,
        sort_by: str,
        sort_order: str,
    ) -> ProductListResponse:
        category_uuid = UUID(category_id) if category_id else None
        products, total = await self.repo.list_products(
            page=page,
            page_size=page_size,
            search=search,
            category_id=category_uuid,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        items = [ProductRead.model_validate(product) for product in products]
        return ProductListResponse(items=items, page=page, page_size=page_size, total=total)

    async def update_product(self, product_id: UUID, payload: ProductUpdate) -> Product:
        product = await self.get_product(product_id)

        updates = payload.model_dump(exclude_unset=True)
        if "sku" in updates and isinstance(updates["sku"], str) and updates["sku"] != product.sku:
            existing_sku = await self.repo.get_product_by_sku(updates["sku"])
            if existing_sku and existing_sku.id != product.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="SKU already exists"
                )

        if "category_id" in updates and updates["category_id"] is not None:
            category_uuid = UUID(updates["category_id"])
            category = await self.repo.get_category(category_uuid)
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
                )
            product.category_id = category_uuid

        for key in ["sku", "name", "description", "price", "stock"]:
            if key in updates:
                setattr(product, key, updates[key])

        await self.session.flush()
        await self.session.commit()
        updated = await self.repo.get_product(product.id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Product not found"
            )
        return updated

    async def delete_product(self, product_id: UUID) -> None:
        product = await self.get_product(product_id)
        product.soft_delete(datetime.now(UTC))
        await self.session.flush()
        await self.session.commit()
