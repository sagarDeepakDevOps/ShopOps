from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.product import ProductCreate, ProductListResponse, ProductRead, ProductUpdate
from app.services.product_service import ProductService

router = APIRouter()


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, db: DbSession, _: AdminUser) -> CategoryRead:
    service = ProductService(db)
    category = await service.create_category(payload)
    return CategoryRead.model_validate(category)


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(db: DbSession) -> list[CategoryRead]:
    service = ProductService(db)
    categories = await service.list_categories()
    return [CategoryRead.model_validate(category) for category in categories]


@router.patch("/categories/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    db: DbSession,
    _: AdminUser,
) -> CategoryRead:
    service = ProductService(db)
    category = await service.update_category(category_id, payload)
    return CategoryRead.model_validate(category)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, db: DbSession, _: AdminUser) -> ProductRead:
    service = ProductService(db)
    product = await service.create_product(payload)
    return ProductRead.model_validate(product)


@router.get("", response_model=ProductListResponse)
async def list_products(
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    category_id: str | None = None,
    min_price: Decimal | None = Query(default=None, gt=0),
    max_price: Decimal | None = Query(default=None, gt=0),
    sort_by: str = Query(default="created_at", pattern="^(created_at|name|price|stock)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> ProductListResponse:
    service = ProductService(db)
    return await service.list_products(
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: UUID, db: DbSession) -> ProductRead:
    service = ProductService(db)
    product = await service.get_product(product_id)
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: DbSession,
    _: AdminUser,
) -> ProductRead:
    service = ProductService(db)
    product = await service.update_product(product_id, payload)
    return ProductRead.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: UUID, db: DbSession, _: AdminUser) -> None:
    service = ProductService(db)
    await service.delete_product(product_id)
