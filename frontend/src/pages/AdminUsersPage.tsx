import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { deactivateUser, listAdminUsers } from "../api/admin";
import { ApiError } from "../components/ui/ApiError";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { extractErrorMessage } from "../lib/errors";
import { formatDateTime } from "../lib/utils";

export function AdminUsersPage() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listAdminUsers({ skip: 0, limit: 100 }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      toast.success("User deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to deactivate user"));
    },
  });

  if (usersQuery.isLoading) {
    return <Loader label="Loading users..." />;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return <ApiError message="Unable to load admin users." />;
  }

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Admin panel"
        title="Users management"
        subtitle="Review account roles and deactivate users when required."
      />

      <section className="glass-panel rounded-3xl p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-2 font-semibold text-slate-900">{user.full_name}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2 capitalize">{user.role}</td>
                  <td className="px-3 py-2">{user.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{formatDateTime(user.created_at)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={!user.is_active || deactivateMutation.isPending}
                      onClick={() => deactivateMutation.mutate(user.id)}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-40"
                    >
                      Deactivate
                    </button>
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
