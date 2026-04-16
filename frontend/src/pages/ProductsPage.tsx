import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { addCartItem } from "../api/orders";
import { listCategories, listProducts } from "../api/products";
import { ApiError } from "../components/ui/ApiError";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { Pagination } from "../components/ui/Pagination";
import { ProductCard } from "../components/ui/ProductCard";
import { extractErrorMessage } from "../lib/errors";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import type { ProductRead } from "../types/api";

const pageSize = 9;

export function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const syncFromCart = useCartStore((state) => state.syncFromCart);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("category_id") ?? "";
  const sortBy = (searchParams.get("sort_by") ?? "created_at") as
    | "created_at"
    | "name"
    | "price"
    | "stock";
  const sortOrder = (searchParams.get("sort_order") ?? "desc") as "asc" | "desc";

  const productsQuery = useQuery({
    queryKey: ["products", page, search, categoryId, sortBy, sortOrder],
    queryFn: () =>
      listProducts({
        page,
        page_size: pageSize,
        search: search || undefined,
        category_id: categoryId || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
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

  const selectedCategoryName = useMemo(() => {
    if (!categoryId || !categoriesQuery.data) {
      return "All categories";
    }
    return categoriesQuery.data.find((category) => category.id === categoryId)?.name ?? "Category";
  }, [categoriesQuery.data, categoryId]);

  function updateParams(values: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === 0) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next);
  }

  function handleRequireLogin() {
    navigate("/login", {
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Public catalog"
        title="ShopOps Product Catalog"
        subtitle="Search and filter live products from the backend inventory service."
      />

      <section className="glass-panel rounded-3xl p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_0.7fr_0.7fr] md:items-end">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Search</span>
            <input
              value={search}
              onChange={(event) => updateParams({ search: event.target.value, page: 1 })}
              placeholder="Search by name or SKU"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Category</span>
            <select
              value={categoryId}
              onChange={(event) => updateParams({ category_id: event.target.value, page: 1 })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">All categories</option>
              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => updateParams({ sort_by: event.target.value, page: 1 })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="created_at">Newest</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock">Stock</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Direction</span>
            <select
              value={sortOrder}
              onChange={(event) => updateParams({ sort_order: event.target.value, page: 1 })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </section>

      {productsQuery.isLoading ? <Loader label="Loading products..." /> : null}

      {productsQuery.isError ? (
        <ApiError message="Unable to load product catalog. Please try again." />
      ) : null}

      {productsQuery.data ? (
        <>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>
              Showing page {productsQuery.data.page} of{" "}
              {Math.max(Math.ceil(productsQuery.data.total / pageSize), 1)}
            </p>
            <p>
              {productsQuery.data.total} products • {selectedCategoryName}
            </p>
          </div>

          {productsQuery.data.items.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try a different search term, category, or sorting preference."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {productsQuery.data.items.map((product, index) => (
                <div key={product.id} style={{ animationDelay: `${index * 60}ms` }}>
                  <ProductCard
                    product={product}
                    isAuthenticated={Boolean(user)}
                    onAdd={user ? (item) => addToCartMutation.mutate(item) : undefined}
                    onRequireAuth={handleRequireLogin}
                    disabled={addToCartMutation.isPending}
                  />
                </div>
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageSize={pageSize}
            total={productsQuery.data.total}
            onChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      ) : null}
    </div>
  );
}
