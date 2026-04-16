import { apiClient } from "../lib/http";
import type { PaymentRead, ProcessPaymentParams } from "../types/api";

export async function processPayment(orderId: string, params?: ProcessPaymentParams) {
  const response = await apiClient.post<PaymentRead>(`/payments/orders/${orderId}/process`, null, {
    params,
  });
  return response.data;
}
