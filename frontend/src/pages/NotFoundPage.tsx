import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">404</p>
      <h1 className="text-4xl text-slate-900">Route not found</h1>
      <p className="text-sm text-slate-600">
        The page you requested does not exist in this ShopOps frontend route map.
      </p>
      <Link
        to="/"
        className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Go home
      </Link>
    </div>
  );
}
