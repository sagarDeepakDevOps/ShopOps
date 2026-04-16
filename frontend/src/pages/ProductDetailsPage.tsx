import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, ShoppingCart } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";

import { addCartItem } from "../api/orders";
import { getProduct } from "../api/products";
import { ApiError } from "../components/ui/ApiError";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { extractErrorMessage } from "../lib/errors";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";

export function ProductDetailsPage() {
  const { productId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const syncFromCart = useCartStore((state) => state.syncFromCart);

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId ?? ""),
    enabled: Boolean(productId),
  });

  const addToCartMutation = useMutation({
    mutationFn: () => addCartItem({ product_id: productId ?? "", quantity: 1 }),
    onSuccess: (cart) => {
      syncFromCart(cart);
      queryClient.invalidateQueries({ queryKey: ["cart"] }).catch(() => undefined);
      toast.success("Item added to cart");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to add item"));
    },
  });

  if (!productId) {
    return <ApiError title="Invalid product" message="Product id is missing from URL." />;
  }

  if (productQuery.isLoading) {
    return <Loader label="Loading product details..." />;
  }

  if (productQuery.isError || !productQuery.data) {
    return <ApiError message="Unable to load this product." />;
  }

  const product = productQuery.data;

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Product details"
        title={product.name}
        subtitle="Live item data from the ShopOps backend"
      />

      <section className="glass-panel grid gap-6 rounded-3xl p-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="inline-flex rounded-2xl bg-cyan-100 p-3 text-cyan-700">
            <Package size={22} />
          </div>

          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SKU {product.sku}</p>

          <p className="text-base text-slate-700">
            {product.description || "No product description available for this item."}
          </p>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm md:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-800">Category:</span>{" "}
              {product.category?.name || "Uncategorized"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Stock:</span> {product.stock}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Created:</span>{" "}
              {formatDateTime(product.created_at)}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Updated:</span>{" "}
              {formatDateTime(product.updated_at)}
            </p>
          </div>
        </div>

        <aside className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Price</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{formatCurrency(product.price)}</p>

          <button
            type="button"
            disabled={!user || product.stock <= 0 || addToCartMutation.isPending}
            onClick={() => addToCartMutation.mutate()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart size={16} /> Add to cart
          </button>

          {!user ? (
            <p className="mt-3 text-sm text-slate-600">
              <Link
                className="font-semibold text-cyan-700"
                to="/login"
                state={{ from: `${location.pathname}${location.search}${location.hash}` }}
              >
                Login
              </Link>{" "}
              to purchase this product.
            </p>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
