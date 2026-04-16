import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getOrder } from "../api/orders";
import { ApiError } from "../components/ui/ApiError";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusPill } from "../components/ui/StatusPill";
import { formatCurrency, formatDateTime } from "../lib/utils";

export function OrderDetailsPage() {
  const { orderId } = useParams();

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId ?? ""),
    enabled: Boolean(orderId),
  });

  if (!orderId) {
    return <ApiError title="Invalid order" message="Missing order id in route." />;
  }

  if (orderQuery.isLoading) {
    return <Loader label="Loading order details..." />;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <ApiError message="Unable to load this order." />;
  }

  const order = orderQuery.data;

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Order details"
        title={`Order #${order.id.slice(0, 8)}`}
        subtitle="Inspect shipping, status, and itemized totals for this checkout."
        actions={
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Back to dashboard
          </Link>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-3xl p-5">
          <h2 className="text-2xl text-slate-900">Items</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"
              >
                <p className="font-semibold text-slate-900">
                  Product {item.product_id.slice(0, 8)}
                </p>
                <p className="text-slate-600">Quantity: {item.quantity}</p>
                <p className="text-slate-600">
                  Unit: {formatCurrency(item.unit_price, order.currency)}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  Line total:{" "}
                  {formatCurrency(Number(item.unit_price) * item.quantity, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="glass-panel rounded-3xl p-5 text-sm text-slate-700">
          <h2 className="text-2xl text-slate-900">Summary</h2>
          <div className="mt-4 space-y-2">
            <p>
              <span className="font-semibold text-slate-900">Status:</span>{" "}
              <StatusPill value={order.status} />
            </p>
            <p>
              <span className="font-semibold text-slate-900">Total:</span>{" "}
              {formatCurrency(order.total_amount, order.currency)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Shipping:</span>{" "}
              {order.shipping_address}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Placed:</span>{" "}
              {formatDateTime(order.created_at)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Updated:</span>{" "}
              {formatDateTime(order.updated_at)}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
