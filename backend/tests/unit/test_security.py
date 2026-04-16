from jose import jwt

from app.core.config import get_settings
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    password = "StrongPassword123!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)


def test_access_token_type_claim() -> None:
    token = create_access_token("123")
    settings = get_settings()
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    assert payload["sub"] == "123"
    assert payload["type"] == TokenType.ACCESS.value


def test_refresh_token_type_claim() -> None:
    token = create_refresh_token("123")
    settings = get_settings()
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    assert payload["sub"] == "123"
    assert payload["type"] == TokenType.REFRESH.value
