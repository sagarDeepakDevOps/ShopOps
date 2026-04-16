from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.rate_limit import limiter
from app.db.init_db import init_db
from app.db.session import engine
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.telemetry.metrics import setup_metrics
from app.telemetry.tracing import setup_tracing


def _rate_limit_exceeded_handler(_: Request, exc: Exception) -> JSONResponse:
    detail = "Rate limit exceeded"
    if isinstance(exc, RateLimitExceeded):
        detail = f"Rate limit exceeded: {exc.detail}"
    return JSONResponse(status_code=429, content={"detail": detail})


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.ENVIRONMENT == "local":
        await init_db(engine)
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    cfg = settings or get_settings()
    configure_logging(cfg.LOG_LEVEL)

    app = FastAPI(
        title=cfg.PROJECT_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=cfg.API_V1_STR)

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {"message": "ShopOps API is running", "docs": "/docs"}

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready", include_in_schema=False)
    async def ready() -> JSONResponse:
        failures: list[str] = []

        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        except Exception:
            failures.append("database")

        try:
            redis_client = redis.from_url(
                cfg.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            try:
                await redis_client.ping()
            finally:
                await redis_client.aclose()
        except Exception:
            failures.append("redis")

        if failures:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "failures": failures},
            )

        return JSONResponse(status_code=200, content={"status": "ready"})

    setup_metrics(app)
    setup_tracing(app)

    return app


app = create_app()
