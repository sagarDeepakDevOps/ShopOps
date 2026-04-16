import { apiClient } from "../lib/http";
import type {
  CategoryPayload,
  CategoryRead,
  ProductListResponse,
  ProductPayload,
  ProductQueryParams,
  ProductRead,
  ProductUpdatePayload,
} from "../types/api";

export async function listCategories() {
  const response = await apiClient.get<CategoryRead[]>("/products/categories");
  return response.data;
}

export async function createCategory(payload: CategoryPayload) {
  const response = await apiClient.post<CategoryRead>("/products/categories", payload);
  return response.data;
}

export async function updateCategory(categoryId: string, payload: Partial<CategoryPayload>) {
  const response = await apiClient.patch<CategoryRead>(
    `/products/categories/${categoryId}`,
    payload,
  );
  return response.data;
}

export async function listProducts(params: ProductQueryParams) {
  const response = await apiClient.get<ProductListResponse>("/products", { params });
  return response.data;
}

export async function getProduct(productId: string) {
  const response = await apiClient.get<ProductRead>(`/products/${productId}`);
  return response.data;
}

export async function createProduct(payload: ProductPayload) {
  const response = await apiClient.post<ProductRead>("/products", payload);
  return response.data;
}

export async function updateProduct(productId: string, payload: ProductUpdatePayload) {
  const response = await apiClient.patch<ProductRead>(`/products/${productId}`, payload);
  return response.data;
}

export async function deleteProduct(productId: string) {
  await apiClient.delete(`/products/${productId}`);
}
