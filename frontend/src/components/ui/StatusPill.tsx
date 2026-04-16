import { cn } from "../../lib/utils";

const statusClassMap: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-cyan-100 text-cyan-800",
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  shipped: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        statusClassMap[value] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {value}
    </span>
  );
}
