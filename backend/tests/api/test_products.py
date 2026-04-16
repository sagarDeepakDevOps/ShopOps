import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_can_create_and_list_products(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    category_resp = await client.post(
        "/api/v1/products/categories",
        json={"name": "Electronics", "description": "Devices"},
        headers=admin_headers,
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json()["id"]

    create_resp = await client.post(
        "/api/v1/products",
        json={
            "category_id": category_id,
            "sku": "LAPTOP-001",
            "name": "Laptop Pro",
            "description": "High-end laptop",
            "price": "1200.00",
            "stock": 10,
        },
        headers=admin_headers,
    )
    assert create_resp.status_code == 201

    list_resp = await client.get("/api/v1/products?page=1&page_size=10")
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["total"] >= 1
    assert any(item["sku"] == "LAPTOP-001" for item in body["items"])


@pytest.mark.asyncio
async def test_non_admin_cannot_create_product(client: AsyncClient) -> None:
    register_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "customer@example.com",
            "password": "Password123!",
            "full_name": "Customer One",
        },
    )
    access_token = register_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    create_resp = await client.post(
        "/api/v1/products",
        json={
            "sku": "NOAUTH-001",
            "name": "Unauthorized Product",
            "description": "Should fail",
            "price": "12.00",
            "stock": 1,
        },
        headers=headers,
    )
    assert create_resp.status_code == 403
