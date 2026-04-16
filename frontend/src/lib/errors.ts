import axios from "axios";

import type { ApiErrorResponse, ApiValidationError } from "../types/api";

function formatValidationErrors(errors: ApiValidationError[]) {
  return errors
    .map((item) => {
      const location = item.loc.join(".");
      return `${location}: ${item.msg}`;
    })
    .join(" | ");
}

export function extractErrorMessage(error: unknown, fallback = "Request failed") {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return formatValidationErrors(detail);
  }

  return error.message || fallback;
}
