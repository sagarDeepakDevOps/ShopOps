interface ApiErrorProps {
  title?: string;
  message: string;
}

export function ApiError({ title = "Something went wrong", message }: ApiErrorProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
