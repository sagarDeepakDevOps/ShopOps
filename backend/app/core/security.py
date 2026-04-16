from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import cast
from uuid import UUID

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return cast(bool, pwd_context.verify(plain_password, hashed_password))


def hash_password(password: str) -> str:
    return cast(str, pwd_context.hash(password))


def _create_token(subject: UUID | str, token_type: TokenType, expires_delta: timedelta) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(subject),
        "type": token_type.value,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return cast(str, jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM))


def create_access_token(subject: UUID | str) -> str:
    settings = get_settings()
    return _create_token(
        subject=subject,
        token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: UUID | str) -> str:
    settings = get_settings()
    return _create_token(
        subject=subject,
        token_type=TokenType.REFRESH,
        expires_delta=timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES),
    )


def decode_token(token: str) -> dict[str, str | int]:
    settings = get_settings()
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    return cast(dict[str, str | int], decoded)
