import { Link } from "react-router-dom";
import { ImageOff, ShoppingCart } from "lucide-react";

import { formatCurrency } from "../../lib/utils";
import type { ProductRead } from "../../types/api";

interface ProductCardProps {
  product: ProductRead;
  onAdd?: (product: ProductRead) => void;
  onRequireAuth?: () => void;
  isAuthenticated?: boolean;
  disabled?: boolean;
}

export function ProductCard({
  product,
  onAdd,
  onRequireAuth,
  isAuthenticated = false,
  disabled = false,
}: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;
  const shouldDisableAdd = disabled || isOutOfStock || (isAuthenticated && !onAdd);
  const addButtonLabel = isOutOfStock
    ? "Out of Stock"
    : isAuthenticated
      ? "Add to Cart"
      : "Login to Add";

  return (
    <article className="fade-up glass-panel flex h-full flex-col rounded-3xl p-4">
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/45 to-slate-100 p-4">
        <div
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-100/70 blur-xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-white p-2 text-cyan-700 shadow-sm ring-1 ring-slate-200">
            <ImageOff size={16} aria-hidden="true" />
          </div>
          <span
            className={
              isOutOfStock
                ? "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
                : isLowStock
                  ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                  : "rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700"
            }
          >
            {isOutOfStock
              ? "Out of stock"
              : isLowStock
                ? `Low stock (${product.stock})`
                : `In stock (${product.stock})`}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{product.sku}</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">{product.name}</h3>
      </div>

      <p className="line-clamp-3 min-h-16 text-sm text-slate-600">
        {product.description || "No description provided."}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xl font-bold text-slate-900">{formatCurrency(product.price)}</span>
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          {product.category?.name || "Uncategorized"}
        </span>
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          to={`/products/${product.id}`}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/65 focus-visible:ring-offset-2"
        >
          Details
        </Link>
        <button
          type="button"
          disabled={shouldDisableAdd}
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth?.();
              return;
            }
            onAdd?.(product);
          }}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/65 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ShoppingCart size={15} aria-hidden="true" /> {addButtonLabel}
        </button>
      </div>
    </article>
  );
}
