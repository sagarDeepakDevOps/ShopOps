const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const API_BASE_URL = rawApiBaseUrl.startsWith("/") ? rawApiBaseUrl : `/${rawApiBaseUrl}`;

export const BACKEND_ROOT_URL = import.meta.env.VITE_BACKEND_ROOT_URL ?? "";
export const APP_NAME = "ShopOps Control Desk";
