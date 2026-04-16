import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { login } from "../../src/api/auth";
import { LoginPage } from "../../src/pages/LoginPage";
import { useAuthStore } from "../../src/stores/authStore";
import { createTestQueryClient } from "./testUtils";

jest.mock("../../src/api/auth", () => ({
  login: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedLogin = login as jest.MockedFunction<typeof login>;

function resetAuthState() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    hasHydrated: true,
  });
}

describe("Login flow", () => {
  beforeEach(() => {
    resetAuthState();
    mockedLogin.mockReset();
  });

  test("signs in and redirects to origin route", async () => {
    mockedLogin.mockResolvedValue({
      tokens: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
      },
      user: {
        id: "user-1",
        email: "customer@example.com",
        full_name: "Customer User",
        role: "customer",
      },
    });

    const router = createMemoryRouter(
      [
        { path: "/login", element: <LoginPage /> },
        { path: "/dashboard", element: <p>Dashboard Destination</p> },
        { path: "/cart", element: <p>Cart Destination</p> },
      ],
      {
        initialEntries: [{ pathname: "/login", state: { from: "/cart" } }],
      },
    );

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "customer@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalled();
      expect(mockedLogin.mock.calls[0]?.[0]).toEqual({
        email: "customer@example.com",
        password: "Password123!",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Cart Destination")).toBeTruthy();
    });

    expect(useAuthStore.getState().user?.email).toBe("customer@example.com");
  });
});
