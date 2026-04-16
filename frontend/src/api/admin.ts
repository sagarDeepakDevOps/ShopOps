import { apiClient } from "../lib/http";
import type {
  AdminDashboard,
  AdminOrdersParams,
  AdminUsersParams,
  OrderRead,
  UpdateOrderStatusPayload,
  UserRead,
} from "../types/api";

export async function getAdminDashboard() {
  const response = await apiClient.get<AdminDashboard>("/admin/dashboard");
  return response.data;
}

export async function listAdminUsers(params: AdminUsersParams) {
  const response = await apiClient.get<UserRead[]>("/admin/users", { params });
  return response.data;
}

export async function deactivateUser(userId: string) {
  const response = await apiClient.patch<UserRead>(`/admin/users/${userId}/deactivate`, {});
  return response.data;
}

export async function listAdminOrders(params: AdminOrdersParams) {
  const response = await apiClient.get<OrderRead[]>("/admin/orders", { params });
  return response.data;
}

export async function updateOrderStatus(orderId: string, payload: UpdateOrderStatusPayload) {
  const response = await apiClient.patch<OrderRead>(`/admin/orders/${orderId}/status`, payload);
  return response.data;
}
