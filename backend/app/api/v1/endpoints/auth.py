from fastapi import APIRouter, Request

from app.api.deps import DbSession
from app.core.rate_limit import limiter
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenPair,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
@limiter.limit("10/minute")
async def register(request: Request, payload: RegisterRequest, db: DbSession) -> AuthResponse:
    del request
    service = AuthService(db)
    return await service.register(payload)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("20/minute")
async def login(request: Request, payload: LoginRequest, db: DbSession) -> AuthResponse:
    del request
    service = AuthService(db)
    return await service.login(payload)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("20/minute")
async def refresh_token(request: Request, payload: RefreshTokenRequest, db: DbSession) -> TokenPair:
    del request
    service = AuthService(db)
    return await service.refresh(payload)


@router.post("/logout")
async def logout() -> dict[str, str]:
    return {"message": "Logged out successfully"}
