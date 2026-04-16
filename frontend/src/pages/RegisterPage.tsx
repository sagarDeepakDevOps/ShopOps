import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { register } from "../api/auth";
import { PageTitle } from "../components/ui/PageTitle";
import { extractErrorMessage } from "../lib/errors";
import { useAuthStore } from "../stores/authStore";

const schema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: FormValues) =>
      register({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
      }),
    onSuccess: (data) => {
      setSession(data);
      queryClient.invalidateQueries({ queryKey: ["profile"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["cart"] }).catch(() => undefined);
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Registration failed"));
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageTitle
        eyebrow="Authentication"
        title="Create your ShopOps account"
        subtitle="Register a customer account and start browsing products immediately."
      />

      <form
        onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
        className="glass-panel space-y-4 rounded-3xl p-6"
      >
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-slate-700">Full name</span>
          <input
            {...form.register("full_name")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="Jane Doe"
          />
          {form.formState.errors.full_name ? (
            <span className="text-xs text-rose-600">{form.formState.errors.full_name.message}</span>
          ) : null}
        </label>

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

        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-slate-700">Confirm password</span>
          <input
            type="password"
            {...form.register("confirm_password")}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            placeholder="••••••••"
          />
          {form.formState.errors.confirm_password ? (
            <span className="text-xs text-rose-600">
              {form.formState.errors.confirm_password.message}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {registerMutation.isPending ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-cyan-700">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
