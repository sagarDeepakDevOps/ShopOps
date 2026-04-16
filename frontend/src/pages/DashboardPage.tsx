import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { listOrders } from "../api/orders";
import { createAddress, deleteAddress, listMyAddresses, updateMyProfile } from "../api/users";
import { ApiError } from "../components/ui/ApiError";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusPill } from "../components/ui/StatusPill";
import { extractErrorMessage } from "../lib/errors";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { useAuthStore } from "../stores/authStore";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
});

const addressSchema = z.object({
  label: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  postal_code: z.string().min(1),
  note: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type AddressForm = z.infer<typeof addressSchema>;

export function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: user?.full_name ?? "",
    },
  });

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      note: "",
    },
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: listMyAddresses,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedUser) => {
      setUser({
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role,
      });
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to update profile"));
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      toast.success("Address added");
      addressForm.reset();
      queryClient.invalidateQueries({ queryKey: ["addresses"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to create address"));
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      toast.success("Address removed");
      queryClient.invalidateQueries({ queryKey: ["addresses"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to remove address"));
    },
  });

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="User dashboard"
        title="Account overview"
        subtitle="Manage profile details, addresses, and view your order history."
      />

      <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <form
          onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))}
          className="glass-panel space-y-4 rounded-3xl p-5"
        >
          <h2 className="text-2xl text-slate-900">Profile</h2>
          <label className="block space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Email</span>
            <input
              value={user?.email ?? ""}
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold text-slate-700">Full name</span>
            <input
              {...profileForm.register("full_name")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
            {profileForm.formState.errors.full_name ? (
              <span className="text-xs text-rose-600">
                {profileForm.formState.errors.full_name.message}
              </span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Update profile"}
          </button>
        </form>

        <form
          onSubmit={addressForm.handleSubmit((values) => createAddressMutation.mutate(values))}
          className="glass-panel space-y-3 rounded-3xl p-5"
        >
          <h2 className="text-2xl text-slate-900">Add address</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="Label"
              {...addressForm.register("label")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="Postal code"
              {...addressForm.register("postal_code")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="Line 1"
              {...addressForm.register("line1")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <input
              placeholder="Line 2 (optional)"
              {...addressForm.register("line2")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <input
              placeholder="City"
              {...addressForm.register("city")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="State"
              {...addressForm.register("state")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="Country"
              {...addressForm.register("country")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="Note (optional)"
              {...addressForm.register("note")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={createAddressMutation.isPending}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createAddressMutation.isPending ? "Adding..." : "Add address"}
          </button>
        </form>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-5">
          <h2 className="text-2xl text-slate-900">Addresses</h2>
          {addressesQuery.isLoading ? <Loader label="Loading addresses..." /> : null}
          {addressesQuery.isError ? <ApiError message="Unable to load addresses." /> : null}
          {addressesQuery.data && addressesQuery.data.length === 0 ? (
            <EmptyState
              title="No addresses"
              description="Add a shipping address to simplify checkout."
            />
          ) : null}
          {addressesQuery.data && addressesQuery.data.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {addressesQuery.data.map((address) => (
                <li key={address.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{address.label}</p>
                      <p>
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}
                      </p>
                      <p>
                        {address.city}, {address.state}, {address.country} {address.postal_code}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAddressMutation.mutate(address.id)}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <h2 className="text-2xl text-slate-900">Order history</h2>
          {ordersQuery.isLoading ? <Loader label="Loading orders..." /> : null}
          {ordersQuery.isError ? <ApiError message="Unable to load orders." /> : null}
          {ordersQuery.data && ordersQuery.data.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Browse the catalog and checkout your first order."
              actionLabel="Explore products"
              actionTo="/products"
            />
          ) : null}
          {ordersQuery.data && ordersQuery.data.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {ordersQuery.data.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">Order #{order.id.slice(0, 8)}</p>
                    <StatusPill value={order.status} />
                  </div>
                  <p className="mt-2 text-slate-600">
                    {formatCurrency(order.total_amount, order.currency)} •{" "}
                    {formatDateTime(order.created_at)}
                  </p>
                  <Link
                    className="mt-3 inline-block font-semibold text-cyan-700"
                    to={`/orders/${order.id}`}
                  >
                    View details
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
