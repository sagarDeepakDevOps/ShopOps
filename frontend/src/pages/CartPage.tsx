import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { checkout, getCart, setCartQuantity } from "../api/orders";
import { processPayment } from "../api/payments";
import { ApiError } from "../components/ui/ApiError";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusPill } from "../components/ui/StatusPill";
import { extractErrorMessage } from "../lib/errors";
import { formatCurrency } from "../lib/utils";
import { useCartStore } from "../stores/cartStore";
import type { CartRead, PaymentRead } from "../types/api";

const checkoutSchema = z.object({
  shipping_address: z.string().min(5, "Shipping address must be at least 5 characters"),
  payment_outcome: z.enum(["auto", "success", "failed"]),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

function cartTotal(cart: CartRead | undefined) {
  if (!cart) {
    return 0;
  }

  return cart.items.reduce((total, item) => total + Number(item.unit_price) * item.quantity, 0);
}

export function CartPage() {
  const queryClient = useQueryClient();
  const syncFromCart = useCartStore((state) => state.syncFromCart);
  const [paymentResult, setPaymentResult] = useState<PaymentRead | null>(null);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_address: "",
      payment_outcome: "auto",
    },
  });

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });

  useEffect(() => {
    if (cartQuery.data) {
      syncFromCart(cartQuery.data);
    }
  }, [cartQuery.data, syncFromCart]);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      setCartQuantity(productId, quantity),
    onSuccess: (cart) => {
      syncFromCart(cart);
      queryClient.setQueryData(["cart"], cart);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to update cart"));
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (values: CheckoutForm) => {
      const order = await checkout({ shipping_address: values.shipping_address });
      const payment = await processPayment(order.id, {
        force_outcome: values.payment_outcome,
      });
      return { order, payment };
    },
    onSuccess: ({ order, payment }) => {
      setPaymentResult(payment);
      syncFromCart({
        id: "",
        user_id: "",
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["orders"] }).catch(() => undefined);
      toast.success(`Checkout complete for order ${order.id.slice(0, 8)}`);
      form.reset({ shipping_address: "", payment_outcome: "auto" });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Checkout failed"));
    },
  });

  const total = cartTotal(cartQuery.data);

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Cart and checkout"
        title="Your cart"
        subtitle="Adjust quantities, remove items, and complete checkout with mock payment outcomes."
      />

      {paymentResult ? (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl text-slate-900">Latest payment result</h2>
            <StatusPill value={paymentResult.status} />
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Provider: {paymentResult.provider} • Reference: {paymentResult.external_ref ?? "-"}
          </p>
          {paymentResult.failure_reason ? (
            <p className="mt-1 text-sm text-rose-700">{paymentResult.failure_reason}</p>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-3xl p-5">
          {cartQuery.isLoading ? <Loader label="Loading cart..." /> : null}
          {cartQuery.isError ? <ApiError message="Unable to load cart." /> : null}

          {cartQuery.data && cartQuery.data.items.length === 0 ? (
            <EmptyState
              title="Cart is empty"
              description="Add products from the catalog to start checkout."
              actionLabel="Browse catalog"
              actionTo="/products"
            />
          ) : null}

          {cartQuery.data && cartQuery.data.items.length > 0 ? (
            <ul className="space-y-3">
              {cartQuery.data.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Product {item.product_id.slice(0, 8)}
                      </p>
                      <p>{formatCurrency(item.unit_price)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`decrease-${item.product_id}`}
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            productId: item.product_id,
                            quantity: Math.max(item.quantity - 1, 0),
                          })
                        }
                        className="rounded-lg border border-slate-300 p-1"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`increase-${item.product_id}`}
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            productId: item.product_id,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="rounded-lg border border-slate-300 p-1"
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`remove-${item.product_id}`}
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            productId: item.product_id,
                            quantity: 0,
                          })
                        }
                        className="rounded-lg border border-rose-200 p-1 text-rose-700"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">
                    Line total: {formatCurrency(Number(item.unit_price) * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <form
          onSubmit={form.handleSubmit((values) => checkoutMutation.mutate(values))}
          className="glass-panel space-y-4 rounded-3xl p-5"
        >
          <h2 className="text-2xl text-slate-900">Checkout</h2>
          <p className="text-sm text-slate-600">Order total: {formatCurrency(total)}</p>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Shipping address</span>
            <textarea
              rows={4}
              {...form.register("shipping_address")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              placeholder="100 Market St, Austin, TX"
            />
            {form.formState.errors.shipping_address ? (
              <span className="text-xs text-rose-600">
                {form.formState.errors.shipping_address.message}
              </span>
            ) : null}
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Payment outcome (for testing)</span>
            <select
              {...form.register("payment_outcome")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="auto">Auto</option>
              <option value="success">Force success</option>
              <option value="failed">Force failed</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={
              checkoutMutation.isPending || !cartQuery.data || cartQuery.data.items.length === 0
            }
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {checkoutMutation.isPending ? "Processing checkout..." : "Checkout"}
          </button>

          <p className="text-xs text-slate-500">
            After checkout, open your order history in{" "}
            <Link className="font-semibold text-cyan-700" to="/dashboard">
              dashboard
            </Link>
            .
          </p>
        </form>
      </section>
    </div>
  );
}
