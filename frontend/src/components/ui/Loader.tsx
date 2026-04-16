export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-6 text-slate-700">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
