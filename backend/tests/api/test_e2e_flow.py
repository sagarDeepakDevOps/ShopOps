from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_api_e2e_flow(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    suffix = uuid4().hex[:8]
    customer_email = f"customer-{suffix}@example.com"
    sku = f"PHONE-{suffix}"
    category_name = f"Electronics-{suffix}"

    health = await client.get("/api/v1/health")
    assert health.status_code == 200

    short_pw = await client.post(
        "/api/v1/auth/register",
        json={"email": f"bad-{suffix}@example.com", "password": "123", "full_name": "Bad"},
    )
    assert short_pw.status_code == 422

    reg_customer = await client.post(
        "/api/v1/auth/register",
        json={
            "email": customer_email,
            "password": "Password123!",
            "full_name": "Customer User",
        },
    )
    assert reg_customer.status_code == 200
    customer_id = reg_customer.json()["user"]["id"]

    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": customer_email, "password": "WrongPass123!"},
    )
    assert bad_login.status_code == 401

    login_customer = await client.post(
        "/api/v1/auth/login",
        json={"email": customer_email, "password": "Password123!"},
    )
    assert login_customer.status_code == 200
    login_json = login_customer.json()
    customer_access = login_json["tokens"]["access_token"]
    customer_refresh = login_json["tokens"]["refresh_token"]
    customer_headers = {"Authorization": f"Bearer {customer_access}"}

    refresh_out = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": customer_refresh},
    )
    assert refresh_out.status_code == 200

    logout_out = await client.post("/api/v1/auth/logout")
    assert logout_out.status_code == 200

    me_out = await client.get("/api/v1/users/me", headers=customer_headers)
    assert me_out.status_code == 200

    update_me = await client.patch(
        "/api/v1/users/me",
        json={"full_name": "Customer Updated"},
        headers=customer_headers,
    )
    assert update_me.status_code == 200
    assert update_me.json()["full_name"] == "Customer Updated"

    addr_create = await client.post(
        "/api/v1/users/me/addresses",
        json={
            "label": "Home",
            "line1": "1 Test St",
            "line2": None,
            "city": "Austin",
            "state": "TX",
            "country": "US",
            "postal_code": "78701",
            "note": "Primary",
        },
        headers=customer_headers,
    )
    assert addr_create.status_code == 201
    addr_id = addr_create.json()["id"]

    addr_list = await client.get("/api/v1/users/me/addresses", headers=customer_headers)
    assert addr_list.status_code == 200
    assert any(item["id"] == addr_id for item in addr_list.json())

    addr_update = await client.patch(
        f"/api/v1/users/me/addresses/{addr_id}",
        json={"city": "Dallas"},
        headers=customer_headers,
    )
    assert addr_update.status_code == 200
    assert addr_update.json()["city"] == "Dallas"

    addr_delete = await client.delete(
        f"/api/v1/users/me/addresses/{addr_id}", headers=customer_headers
    )
    assert addr_delete.status_code == 204

    cat_create = await client.post(
        "/api/v1/products/categories",
        json={"name": category_name, "description": "Devices"},
        headers=admin_headers,
    )
    assert cat_create.status_code == 201
    cat_id = cat_create.json()["id"]

    prod_create = await client.post(
        "/api/v1/products",
        json={
            "category_id": cat_id,
            "sku": sku,
            "name": "Phone",
            "description": "Smart phone",
            "price": "599.99",
            "stock": 20,
        },
        headers=admin_headers,
    )
    assert prod_create.status_code == 201
    prod_id = prod_create.json()["id"]

    forbidden_create = await client.post(
        "/api/v1/products",
        json={
            "sku": f"NOPE-{suffix}",
            "name": "Nope",
            "description": "No",
            "price": "10.00",
            "stock": 1,
        },
        headers=customer_headers,
    )
    assert forbidden_create.status_code == 403

    prod_list = await client.get(
        "/api/v1/products",
        params={
            "page": 1,
            "page_size": 10,
            "search": "Phone",
            "sort_by": "price",
            "sort_order": "asc",
        },
    )
    assert prod_list.status_code == 200
    assert any(item["id"] == prod_id for item in prod_list.json()["items"])

    prod_update = await client.patch(
        f"/api/v1/products/{prod_id}",
        json={"price": "549.99", "stock": 25},
        headers=admin_headers,
    )
    assert prod_update.status_code == 200

    bad_cart = await client.post(
        "/api/v1/orders/cart/items",
        json={"product_id": prod_id, "quantity": 0},
        headers=customer_headers,
    )
    assert bad_cart.status_code == 422

    cart_add = await client.post(
        "/api/v1/orders/cart/items",
        json={"product_id": prod_id, "quantity": 2},
        headers=customer_headers,
    )
    assert cart_add.status_code == 200

    cart_get = await client.get("/api/v1/orders/cart", headers=customer_headers)
    assert cart_get.status_code == 200
    assert len(cart_get.json()["items"]) >= 1

    cart_remove = await client.delete(
        f"/api/v1/orders/cart/items/{prod_id}", headers=customer_headers
    )
    assert cart_remove.status_code == 200

    cart_add2 = await client.post(
        "/api/v1/orders/cart/items",
        json={"product_id": prod_id, "quantity": 1},
        headers=customer_headers,
    )
    assert cart_add2.status_code == 200

    checkout1 = await client.post(
        "/api/v1/orders/checkout",
        json={"shipping_address": "100 Market St, Austin, TX"},
        headers=customer_headers,
    )
    assert checkout1.status_code == 201
    order1_id = checkout1.json()["id"]

    orders_hist = await client.get("/api/v1/orders", headers=customer_headers)
    assert orders_hist.status_code == 200
    assert any(order["id"] == order1_id for order in orders_hist.json())

    pay_fail = await client.post(
        f"/api/v1/payments/orders/{order1_id}/process",
        params={"force_outcome": "failed"},
        headers=customer_headers,
    )
    assert pay_fail.status_code == 200
    assert pay_fail.json()["status"] == "failed"

    pay_conflict = await client.post(
        f"/api/v1/payments/orders/{order1_id}/process",
        headers=customer_headers,
    )
    assert pay_conflict.status_code == 409

    pay_retry = await client.post(
        f"/api/v1/payments/orders/{order1_id}/process",
        params={"retry": True, "force_outcome": "success"},
        headers=customer_headers,
    )
    assert pay_retry.status_code == 200
    assert pay_retry.json()["status"] == "success"

    cart_add3 = await client.post(
        "/api/v1/orders/cart/items",
        json={"product_id": prod_id, "quantity": 1},
        headers=customer_headers,
    )
    assert cart_add3.status_code == 200

    checkout2 = await client.post(
        "/api/v1/orders/checkout",
        json={"shipping_address": "200 Main St, Austin, TX"},
        headers=customer_headers,
    )
    assert checkout2.status_code == 201
    order2_id = checkout2.json()["id"]

    pay_success = await client.post(
        f"/api/v1/payments/orders/{order2_id}/process",
        params={"force_outcome": "success"},
        headers=customer_headers,
    )
    assert pay_success.status_code == 200

    admin_dash = await client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert admin_dash.status_code == 200

    admin_users = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert admin_users.status_code == 200

    admin_orders = await client.get("/api/v1/admin/orders", headers=admin_headers)
    assert admin_orders.status_code == 200

    admin_order_status = await client.patch(
        f"/api/v1/admin/orders/{order2_id}/status",
        json={"status": "shipped"},
        headers=admin_headers,
    )
    assert admin_order_status.status_code == 200
    assert admin_order_status.json()["status"] == "shipped"

    admin_deactivate = await client.patch(
        f"/api/v1/admin/users/{customer_id}/deactivate",
        json={},
        headers=admin_headers,
    )
    assert admin_deactivate.status_code == 200
    assert admin_deactivate.json()["is_active"] is False

    prod_delete = await client.delete(f"/api/v1/products/{prod_id}", headers=admin_headers)
    assert prod_delete.status_code == 204
