import { apiClient } from "../lib/http";
import type { CartItemAddPayload, CartRead, CheckoutPayload, OrderRead } from "../types/api";

export async function getCart() {
  const response = await apiClient.get<CartRead>("/orders/cart");
  return response.data;
}

export async function addCartItem(payload: CartItemAddPayload) {
  const response = await apiClient.post<CartRead>("/orders/cart/items", payload);
  return response.data;
}

export async function removeCartItem(productId: string) {
  const response = await apiClient.delete<CartRead>(`/orders/cart/items/${productId}`);
  return response.data;
}

export async function setCartQuantity(productId: string, quantity: number) {
  await removeCartItem(productId);
  if (quantity > 0) {
    return addCartItem({ product_id: productId, quantity });
  }
  return getCart();
}

export async function checkout(payload: CheckoutPayload) {
  const response = await apiClient.post<OrderRead>("/orders/checkout", payload);
  return response.data;
}

export async function listOrders() {
  const response = await apiClient.get<OrderRead[]>("/orders");
  return response.data;
}

export async function getOrder(orderId: string) {
  const response = await apiClient.get<OrderRead>(`/orders/${orderId}`);
  return response.data;
}
