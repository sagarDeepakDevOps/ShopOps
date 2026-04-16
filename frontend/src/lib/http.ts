import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "../stores/authStore";
import type { TokenPair } from "../types/api";
import { API_BASE_URL } from "./env";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const authFreeRoutes = ["/auth/login", "/auth/register", "/auth/refresh"];

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
  },
});

function isAuthFreeRoute(url?: string) {
  if (!url) {
    return false;
  }
  return authFreeRoutes.some((route) => url.includes(route));
}

let refreshPromise: Promise<string | null> | null = null;

async function getFreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken, updateTokens, clearSession } = useAuthStore.getState();
    if (!refreshToken) {
      clearSession();
      return null;
    }

    try {
      const response = await refreshClient.post<TokenPair>("/auth/refresh", {
        refresh_token: refreshToken,
      });
      updateTokens(response.data);
      return response.data.access_token;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthFreeRoute(originalRequest.url)
    ) {
      originalRequest._retry = true;
      const newToken = await getFreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
