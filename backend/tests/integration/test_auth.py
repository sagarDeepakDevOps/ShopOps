import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_login_refresh_flow(client: AsyncClient) -> None:
    register_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "john@example.com",
            "password": "Password123!",
            "full_name": "John Doe",
        },
    )
    assert register_resp.status_code == 200
    register_body = register_resp.json()
    assert "tokens" in register_body

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "john@example.com", "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    login_body = login_resp.json()
    assert "access_token" in login_body["tokens"]

    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login_body["tokens"]["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
    refresh_body = refresh_resp.json()
    assert "access_token" in refresh_body
