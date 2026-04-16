from pydantic import BaseModel


class AdminDashboard(BaseModel):
    total_users: int
    total_products: int
    total_orders: int
    pending_orders: int
    paid_orders: int


class AdminOrderStatusUpdate(BaseModel):
    status: str
