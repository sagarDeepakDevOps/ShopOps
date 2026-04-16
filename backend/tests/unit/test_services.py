from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.category import Category
from app.models.order import Order, OrderStatus
from app.models.payment import PaymentStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.user import AddressCreate, AddressUpdate, UserUpdate
from app.services.admin_service import AdminService
from app.services.auth_service import AuthService
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.services.product_service import ProductService
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_product_service_conflicts_and_updates(db_session: AsyncSession) -> None:
    service = ProductService(db_session)
    suffix = uuid4().hex[:8]

    category = await service.create_category(
        CategoryCreate(name=f"cat-{suffix}", description="primary")
    )
    await service.create_category(CategoryCreate(name=f"other-{suffix}", description="secondary"))

    with pytest.raises(HTTPException) as exc:
        await service.create_category(CategoryCreate(name=f"cat-{suffix}", description="dup"))
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        await service.update_category(uuid4(), CategoryUpdate(name="missing"))
    assert exc.value.status_code == 404

    with pytest.raises(HTTPException) as exc:
        await service.update_category(category.id, CategoryUpdate(name=f"other-{suffix}"))
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        await service.create_product(
            ProductCreate(
                category_id=str(uuid4()),
                sku=f"sku-missing-{suffix}",
                name="Bad Product",
                description="missing category",
                price=Decimal("10.00"),
                stock=1,
            )
        )
    assert exc.value.status_code == 404

    product_a = await service.create_product(
        ProductCreate(
            category_id=str(category.id),
            sku=f"sku-a-{suffix}",
            name="Phone A",
            description="product a",
            price=Decimal("499.99"),
            stock=5,
        )
    )
    await service.create_product(
        ProductCreate(
            category_id=str(category.id),
            sku=f"sku-b-{suffix}",
            name="Phone B",
            description="product b",
            price=Decimal("599.99"),
            stock=4,
        )
    )

    with pytest.raises(HTTPException) as exc:
        await service.create_product(
            ProductCreate(
                category_id=str(category.id),
                sku=f"sku-a-{suffix}",
                name="Duplicate SKU",
                description="duplicate",
                price=Decimal("9.99"),
                stock=1,
            )
        )
    assert exc.value.status_code == 409

    listed = await service.list_products(
        page=1,
        page_size=10,
        search="Phone",
        category_id=str(category.id),
        min_price=Decimal("100.00"),
        max_price=Decimal("700.00"),
        sort_by="price",
        sort_order="asc",
    )
    assert listed.total >= 2

    with pytest.raises(HTTPException) as exc:
        await service.get_product(uuid4())
    assert exc.value.status_code == 404

    with pytest.raises(HTTPException) as exc:
        await service.update_product(product_a.id, ProductUpdate(sku=f"sku-b-{suffix}"))
    assert exc.value.status_code == 409

    updated = await service.update_product(
        product_a.id,
        ProductUpdate(name="Phone A2", price=Decimal("479.99"), stock=3),
    )
    assert updated.name == "Phone A2"

    await service.delete_product(product_a.id)


@pytest.mark.asyncio
async def test_order_and_payment_service_branches(db_session: AsyncSession) -> None:
    suffix = uuid4().hex[:8]
    user = User(
        email=f"orders-{suffix}@example.com",
        full_name="Order User",
        hashed_password=hash_password("Password123!"),
        role=UserRole.CUSTOMER,
    )
    category = Category(name=f"order-cat-{suffix}", description="order tests")
    product = Product(
        category=category,
        sku=f"order-sku-{suffix}",
        name="Order Product",
        description="order product",
        price=Decimal("20.00"),
        stock=2,
    )
    db_session.add_all([user, category, product])
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(product)

    order_service = OrderService(db_session)

    with pytest.raises(HTTPException) as exc:
        await order_service.add_to_cart(user.id, uuid4(), 1)
    assert exc.value.status_code == 404

    with pytest.raises(HTTPException) as exc:
        await order_service.add_to_cart(user.id, product.id, 10)
    assert exc.value.status_code == 400

    cart = await order_service.add_to_cart(user.id, product.id, 1)
    assert cart.id is not None

    with pytest.raises(HTTPException) as exc:
        await order_service.remove_from_cart(user.id, uuid4())
    assert exc.value.status_code == 404

    cart = await order_service.remove_from_cart(user.id, product.id)
    assert len(cart.items) == 0

    with pytest.raises(HTTPException) as exc:
        await order_service.checkout(user.id, "100 Test St")
    assert exc.value.status_code == 400

    total = await order_service.calculate_cart_total(user.id)
    assert total == Decimal("0")

    order = Order(
        user_id=user.id,
        total_amount=Decimal("20.00"),
        shipping_address="100 Test St",
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    payment_service = PaymentService(db_session)

    with pytest.raises(HTTPException) as exc:
        await payment_service.process_mock_payment(uuid4())
    assert exc.value.status_code == 404

    failed_payment = await payment_service.process_mock_payment(order.id, force_outcome="failed")
    assert failed_payment.status == PaymentStatus.FAILED

    with pytest.raises(HTTPException) as exc:
        await payment_service.process_mock_payment(order.id)
    assert exc.value.status_code == 409

    retried_payment = await payment_service.process_mock_payment(
        order.id,
        retry=True,
        force_outcome="success",
    )
    assert retried_payment.status == PaymentStatus.SUCCESS

    reused_payment = await payment_service.process_mock_payment(order.id)
    assert reused_payment.status == PaymentStatus.SUCCESS


@pytest.mark.asyncio
async def test_auth_admin_and_user_service_branches(db_session: AsyncSession) -> None:
    suffix = uuid4().hex[:8]
    auth_service = AuthService(db_session)

    register_payload = RegisterRequest(
        email=f"auth-{suffix}@example.com",
        password="Password123!",
        full_name="Auth User",
    )
    auth_response = await auth_service.register(register_payload)
    assert auth_response.user.email.startswith("auth-")

    with pytest.raises(HTTPException) as exc:
        await auth_service.register(register_payload)
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        await auth_service.login(
            LoginRequest(email=register_payload.email, password="WrongPassword123!")
        )
    assert exc.value.status_code == 401

    login_response = await auth_service.login(
        LoginRequest(email=register_payload.email, password="Password123!")
    )
    assert login_response.tokens.access_token

    with pytest.raises(HTTPException) as exc:
        await auth_service.refresh(RefreshTokenRequest(refresh_token="invalid-token"))
    assert exc.value.status_code == 401

    with pytest.raises(HTTPException) as exc:
        await auth_service.refresh(
            RefreshTokenRequest(refresh_token=create_access_token(auth_response.user.id))
        )
    assert exc.value.status_code == 401

    user = await auth_service.users.get_by_email(register_payload.email)
    assert user is not None

    user_service = UserService(db_session)

    with pytest.raises(HTTPException) as exc:
        await user_service.add_address(
            uuid4(),
            AddressCreate(
                label="Home",
                line1="1 Main",
                line2=None,
                city="Austin",
                state="TX",
                country="US",
                postal_code="78701",
                note=None,
            ),
        )
    assert exc.value.status_code == 404

    updated_user = await user_service.update_profile(user, UserUpdate(full_name="Updated Name"))
    assert updated_user.full_name == "Updated Name"

    address = await user_service.add_address(
        user.id,
        AddressCreate(
            label="Home",
            line1="1 Main",
            line2=None,
            city="Austin",
            state="TX",
            country="US",
            postal_code="78701",
            note=None,
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await user_service.update_address(user.id, uuid4(), AddressUpdate(city="Dallas"))
    assert exc.value.status_code == 404

    updated_address = await user_service.update_address(
        user.id,
        address.id,
        AddressUpdate(city="Dallas"),
    )
    assert updated_address.city == "Dallas"

    with pytest.raises(HTTPException) as exc:
        await user_service.delete_address(user.id, uuid4())
    assert exc.value.status_code == 404

    await user_service.delete_address(user.id, address.id)

    deactivated = await user_service.deactivate_user(user)
    assert deactivated.is_active is False

    admin_service = AdminService(db_session)
    dashboard = await admin_service.dashboard()
    assert dashboard["total_users"] >= 1
    assert isinstance(await admin_service.list_users(), list)
    assert isinstance(await admin_service.list_orders(), list)

    with pytest.raises(HTTPException) as exc:
        await admin_service.deactivate_user(uuid4())
    assert exc.value.status_code == 404

    with pytest.raises(HTTPException) as exc:
        await admin_service.update_order_status(uuid4(), "shipped")
    assert exc.value.status_code == 404

    order = Order(
        user_id=user.id,
        total_amount=Decimal("5.00"),
        shipping_address="1 Test St",
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    with pytest.raises(HTTPException) as exc:
        await admin_service.update_order_status(order.id, "not-a-status")
    assert exc.value.status_code == 422

    updated_order = await admin_service.update_order_status(order.id, "shipped")
    assert updated_order.status == OrderStatus.SHIPPED
