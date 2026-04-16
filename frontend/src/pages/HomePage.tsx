import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, ShoppingBag, Sparkles, Workflow } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { addCartItem } from "../api/orders";
import { listProducts } from "../api/products";
import { ApiError } from "../components/ui/ApiError";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { ProductCard } from "../components/ui/ProductCard";
import { extractErrorMessage } from "../lib/errors";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import type { ProductRead } from "../types/api";

const highlights = [
  {
    title: "Enterprise catalog",
    description: "Search by SKU, category, stock, and pricing with low-latency pagination.",
    icon: ShoppingBag,
  },
  {
    title: "Role-secured operations",
    description: "JWT and admin guardrails mapped directly to backend authorization policies.",
    icon: ShieldCheck,
  },
  {
    title: "Order lifecycle control",
    description: "Checkout and payment outcomes fully observable from user and admin dashboards.",
    icon: Workflow,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const syncFromCart = useCartStore((state) => state.syncFromCart);

  const featuredProducts = useQuery({
    queryKey: ["featured-products"],
    queryFn: () =>
      listProducts({
        page: 1,
        page_size: 6,
        sort_by: "created_at",
        sort_order: "desc",
      }),
  });

  const addToCartMutation = useMutation({
    mutationFn: (product: ProductRead) => addCartItem({ product_id: product.id, quantity: 1 }),
    onSuccess: (cart) => {
      syncFromCart(cart);
      queryClient.invalidateQueries({ queryKey: ["cart"] }).catch(() => undefined);
      toast.success("Added to cart");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to add item"));
    },
  });

  function handleRequireLogin() {
    navigate("/login", {
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }

  return (
    <div className="space-y-10">
      <section className="hero-mesh glass-panel overflow-hidden rounded-3xl p-6 md:p-10">
        <div className="fade-up grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
              <Sparkles size={14} />
              Modern commerce cockpit
            </p>
            <h1 className="text-4xl leading-tight text-slate-900 md:text-6xl">
              Run ShopOps with confidence from your browser.
            </h1>
            <p className="max-w-2xl text-sm text-slate-700 md:text-lg">
              Browse products, manage carts, process orders, and control admin operations through a
              production-ready interface connected to real backend APIs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Browse catalog <ArrowRight size={16} />
              </Link>
              <Link
                to={user ? "/dashboard" : "/register"}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                {user ? "Open dashboard" : "Create account"}
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Quick links
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>
                <Link className="hover:text-slate-900" to="/products">
                  Product catalog with filters and pagination
                </Link>
              </li>
              <li>
                <Link className="hover:text-slate-900" to="/cart">
                  Cart and checkout workflow
                </Link>
              </li>
              <li>
                <Link className="hover:text-slate-900" to="/monitoring">
                  API health and metrics status
                </Link>
              </li>
              {user?.role === "admin" ? (
                <li>
                  <Link className="hover:text-slate-900" to="/admin">
                    Admin analytics and management panel
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="glass-panel fade-up rounded-2xl p-5"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="inline-flex rounded-xl bg-slate-900 p-2 text-white">
                <Icon size={18} />
              </div>
              <h2 className="mt-3 text-xl text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-slate-900">Latest products</h2>
          <Link className="text-sm font-semibold text-cyan-700" to="/products">
            View all
          </Link>
        </div>

        {featuredProducts.isLoading ? <Loader label="Loading featured products..." /> : null}

        {featuredProducts.isError ? <ApiError message="Could not load featured products." /> : null}

        {!featuredProducts.isLoading &&
        featuredProducts.data &&
        featuredProducts.data.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.data.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={Boolean(user)}
                onAdd={user ? (item) => addToCartMutation.mutate(item) : undefined}
                onRequireAuth={handleRequireLogin}
                disabled={addToCartMutation.isPending}
              />
            ))}
          </div>
        ) : null}

        {!featuredProducts.isLoading &&
        featuredProducts.data &&
        featuredProducts.data.items.length === 0 ? (
          <EmptyState
            title="No featured products available"
            description="Inventory is currently being prepared. Browse the full catalog for all active items."
            actionLabel="Open catalog"
            actionTo="/products"
          />
        ) : null}
      </section>
    </div>
  );
}
