import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Loader } from "../ui/Loader";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute() {
  const { user, accessToken, hasHydrated } = useAuthStore();
  const location = useLocation();

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <Loader label="Restoring your session..." />
      </div>
    );
  }

  if (!user || !accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <Loader label="Checking admin access..." />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
