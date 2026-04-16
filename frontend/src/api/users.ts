import { apiClient } from "../lib/http";
import type { AddressPayload, AddressRead, UserRead, UserUpdatePayload } from "../types/api";

export async function getMyProfile() {
  const response = await apiClient.get<UserRead>("/users/me");
  return response.data;
}

export async function updateMyProfile(payload: UserUpdatePayload) {
  const response = await apiClient.patch<UserRead>("/users/me", payload);
  return response.data;
}

export async function listMyAddresses() {
  const response = await apiClient.get<AddressRead[]>("/users/me/addresses");
  return response.data;
}

export async function createAddress(payload: AddressPayload) {
  const response = await apiClient.post<AddressRead>("/users/me/addresses", payload);
  return response.data;
}

export async function updateAddress(addressId: string, payload: Partial<AddressPayload>) {
  const response = await apiClient.patch<AddressRead>(`/users/me/addresses/${addressId}`, payload);
  return response.data;
}

export async function deleteAddress(addressId: string) {
  await apiClient.delete(`/users/me/addresses/${addressId}`);
}
