import { beforeEach, describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AdminRoute, ProtectedRoute } from "../../src/components/auth/RouteGuards";
import { useAuthStore } from "../../src/stores/authStore";

function resetAuthState() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    hasHydrated: true,
  });
}

describe("Route guards", () => {
  beforeEach(() => {
    resetAuthState();
  });

  test("redirects unauthenticated users to login", () => {
    render(
      <MemoryRouter initialEntries={["/cart?ref=unit"]}>
        <Routes>
          <Route path="/login" element={<p>Login Destination</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<p>Cart Destination</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Destination")).toBeTruthy();
  });

  test("redirects non-admin users away from admin routes", () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "customer@example.com",
        full_name: "Customer User",
        role: "customer",
      },
      accessToken: "token",
      hasHydrated: true,
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/dashboard" element={<p>Dashboard Destination</p>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<p>Admin Destination</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard Destination")).toBeTruthy();
  });
});
