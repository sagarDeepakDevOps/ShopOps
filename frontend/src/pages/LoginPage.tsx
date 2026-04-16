import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { login } from "../api/auth";
import { PageTitle } from "../components/ui/PageTitle";
import { extractErrorMessage } from "../lib/errors";
import { useAuthStore } from "../stores/authStore";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  const fromPath = (location.state as { from?: string } | null)?.from;
  const safeRedirectPath =
    fromPath && fromPath.startsWith("/") && !["/login", "/register"].includes(fromPath)
      ? fromPath
      : "/dashboard";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data);
      queryClient.invalidateQueries({ queryKey: ["profile"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["cart"] }).catch(() => undefined);
      toast.success("Login successful");
      navigate(safeRedirectPath, { replace: true });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Login failed"));
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageTitle
        eyebrow="Authentication"
        title="Login to ShopOps"
        subtitle="Use your account credentials to access dashboard, cart, and admin routes."
      />

      <form
        onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
        className="glass-panel space-y-4 rounded-3xl p-6"
      >
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-slate-700">Email</span>
          <input
            type="email"
            {...form.register("email")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="you@example.com"
          />
          {form.formState.errors.email ? (
            <span className="text-xs text-rose-600">{form.formState.errors.email.message}</span>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-slate-700">Password</span>
          <input
            type="password"
            {...form.register("password")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="••••••••"
          />
          {form.formState.errors.password ? (
            <span className="text-xs text-rose-600">{form.formState.errors.password.message}</span>
          ) : null}
        </label>

        <div className="text-right text-xs text-slate-500">
          Forgot password: placeholder (backend reset endpoint not exposed).
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-slate-600">
          No account yet?{" "}
          <Link to="/register" className="font-semibold text-cyan-700">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
