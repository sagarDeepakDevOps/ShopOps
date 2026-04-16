import {
  BarChart3,
  HeartPulse,
  LogOut,
  PackageSearch,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logout } from "../../api/auth";
import { useCartSync, useProfileSync } from "../../hooks/useSession";
import { APP_NAME } from "../../lib/env";
import { extractErrorMessage } from "../../lib/errors";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { useCartStore } from "../../stores/cartStore";

const navItems = [
  { to: "/", label: "Home", icon: Store },
  { to: "/products", label: "Catalog", icon: PackageSearch },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/dashboard", label: "Dashboard", icon: User },
  { to: "/admin", label: "Admin", icon: BarChart3, adminOnly: true },
  { to: "/monitoring", label: "Monitoring", icon: HeartPulse },
];

export function MainLayout() {
  useProfileSync();
  useCartSync();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, clearSession } = useAuthStore();
  const { itemCount, clear: clearCart } = useCartStore();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearSession();
      clearCart();
      queryClient.clear();
      toast.success("Logged out");
      navigate("/");
    },
    onError: (error) => {
      clearSession();
      clearCart();
      queryClient.clear();
      toast.error(extractErrorMessage(error, "Logged out locally"));
      navigate("/");
    },
  });

  const navLinkBaseClass =
    "group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/65 focus-visible:ring-offset-2";

  const authLinkBaseClass =
    "rounded-xl px-3 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/65 focus-visible:ring-offset-2";

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:flex-nowrap md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
              SO
            </span>
            <span className="text-lg font-semibold tracking-wide text-slate-900">{APP_NAME}</span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-2 md:w-auto">
            {navItems
              .filter((item) => (item.adminOnly ? user?.role === "admin" : true))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        navLinkBaseClass,
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} />
                        {item.label}
                        {item.to === "/cart" && itemCount > 0 ? (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[11px] font-semibold transition",
                              isActive
                                ? "bg-white text-slate-900"
                                : "bg-cyan-400 text-slate-900 group-hover:bg-cyan-300",
                            )}
                          >
                            {itemCount}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
          </nav>

          <div className="order-2 flex items-center gap-2 text-sm md:order-3">
            {user ? (
              <>
                <span className="rounded-xl bg-slate-100 px-3 py-1.5 font-medium text-slate-700 max-sm:hidden">
                  {user.full_name}
                </span>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/65 focus-visible:ring-offset-2"
                >
                  <LogOut size={15} /> Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    cn(
                      authLinkBaseClass,
                      "border border-slate-300 text-slate-700 hover:border-slate-500 hover:text-slate-900",
                      isActive && "border-cyan-700 bg-cyan-50 text-cyan-900",
                    )
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    cn(
                      authLinkBaseClass,
                      "bg-slate-900 text-white hover:bg-slate-800",
                      isActive && "bg-cyan-700",
                    )
                  }
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-8 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
