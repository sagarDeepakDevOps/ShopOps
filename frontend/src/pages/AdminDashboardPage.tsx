import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getAdminDashboard } from "../api/admin";
import { ApiError } from "../components/ui/ApiError";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";

export function AdminDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboard,
  });

  if (dashboardQuery.isLoading) {
    return <Loader label="Loading admin dashboard..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <ApiError message="Unable to load admin analytics." />;
  }

  const data = dashboardQuery.data;
  const chartData = [
    { name: "Users", value: data.total_users },
    { name: "Products", value: data.total_products },
    { name: "Orders", value: data.total_orders },
    { name: "Pending", value: data.pending_orders },
    { name: "Paid", value: data.paid_orders },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Admin panel"
        title="Operations dashboard"
        subtitle="Track platform totals and monitor order/payment lifecycle states."
        actions={
          <div className="flex gap-2">
            <Link
              to="/admin/products"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Products
            </Link>
            <Link
              to="/admin/orders"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Orders
            </Link>
            <Link
              to="/admin/users"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Users
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total users" value={data.total_users} />
        <KpiCard label="Total products" value={data.total_products} />
        <KpiCard label="Total orders" value={data.total_orders} />
        <KpiCard label="Pending orders" value={data.pending_orders} />
        <KpiCard label="Paid orders" value={data.paid_orders} />
      </section>

      <section className="glass-panel rounded-3xl p-5">
        <h2 className="text-2xl text-slate-900">Analytics snapshot</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
              <XAxis dataKey="name" tick={{ fill: "#334155", fontSize: 12 }} />
              <YAxis tick={{ fill: "#334155", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f4a7c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
