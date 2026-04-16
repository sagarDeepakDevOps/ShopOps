import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { listAdminOrders, updateOrderStatus } from "../api/admin";
import { ApiError } from "../components/ui/ApiError";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusPill } from "../components/ui/StatusPill";
import { extractErrorMessage } from "../lib/errors";
import { formatCurrency, formatDateTime } from "../lib/utils";
import type { OrderStatus } from "../types/api";

const statusOptions: OrderStatus[] = [
  "pending",
  "paid",
  "failed",
  "shipped",
  "completed",
  "cancelled",
];

export function AdminOrdersPage() {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => listAdminOrders({ skip: 0, limit: 100 }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, { status }),
    onSuccess: () => {
      toast.success("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to update order"));
    },
  });

  if (ordersQuery.isLoading) {
    return <Loader label="Loading orders..." />;
  }

  if (ordersQuery.isError || !ordersQuery.data) {
    return <ApiError message="Unable to load admin orders." />;
  }

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Admin panel"
        title="Orders management"
        subtitle="Review and update order states across the platform."
      />

      <section className="glass-panel rounded-3xl p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Update</th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.data.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-2 font-semibold text-slate-900">{order.id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{order.user_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{order.items.length}</td>
                  <td className="px-3 py-2">
                    {formatCurrency(order.total_amount, order.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill value={order.status} />
                  </td>
                  <td className="px-3 py-2">{formatDateTime(order.created_at)}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`status-${order.id}`}
                      value={order.status}
                      onChange={(event) =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: event.target.value as OrderStatus,
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
