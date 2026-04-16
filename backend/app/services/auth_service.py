from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthResponse,
    AuthUser,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenPair,
)


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def register(self, payload: RegisterRequest) -> AuthResponse:
        existing = await self.users.get_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            role=UserRole.CUSTOMER,
        )
        await self.users.create(user)
        await self.session.commit()

        tokens = TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
        return AuthResponse(
            tokens=tokens,
            user=AuthUser(
                id=user.id, email=user.email, full_name=user.full_name, role=user.role.value
            ),
        )

    async def login(self, payload: LoginRequest) -> AuthResponse:
        user = await self.users.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        tokens = TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
        return AuthResponse(
            tokens=tokens,
            user=AuthUser(
                id=user.id, email=user.email, full_name=user.full_name, role=user.role.value
            ),
        )

    async def refresh(self, payload: RefreshTokenRequest) -> TokenPair:
        try:
            token_payload = decode_token(payload.refresh_token)
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            ) from exc

        token_type = token_payload.get("type")
        if token_type != TokenType.REFRESH.value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
            )

        subject = token_payload.get("sub")
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject"
            )

        user = await self.users.get_by_id(UUID(str(subject)))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
