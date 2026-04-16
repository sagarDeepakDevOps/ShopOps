import { apiClient } from "../lib/http";
import type {
  AuthResponse,
  LoginPayload,
  RefreshPayload,
  RegisterPayload,
  TokenPair,
} from "../types/api";

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function refreshToken(payload: RefreshPayload) {
  const response = await apiClient.post<TokenPair>("/auth/refresh", payload);
  return response.data;
}

export async function logout() {
  const response = await apiClient.post<{ message: string }>("/auth/logout");
  return response.data;
}
