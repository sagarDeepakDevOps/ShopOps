from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.orders import router as orders_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.users import router as users_router

__all__ = [
    "admin_router",
    "auth_router",
    "health_router",
    "orders_router",
    "payments_router",
    "products_router",
    "users_router",
]
