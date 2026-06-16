import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { getDeletionRequestMap } from "@/lib/account-deletion";
import { getCurrentUser } from "@/lib/auth";
import { adminLinks } from "@/lib/navigation";
import { getUsers } from "@/lib/users";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatRequestDate(value?: string) {
  if (!value) return "No request";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function requestBadge(value?: string) {
  if (!value) return <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-black/45">No request</span>;
  return (
    <span className="inline-flex flex-col gap-0.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
      <span>Deletion requested</span>
      <span className="font-medium text-red-700/75">{formatRequestDate(value)}</span>
    </span>
  );
}

export default async function AdminUsersPage() {
  const [users, deletionRequests, admin] = await Promise.all([getUsers(), getDeletionRequestMap(), getCurrentUser()]);

  return (
    <DashboardShell
      title="Users"
      subtitle="Admin dashboard"
      description="Review account deletion requests and anonymize guest or host accounts when they are eligible."
      links={adminLinks}
    >
      <div className="space-y-3 md:hidden">
        {users.map((user) => {
          const alreadyDeleted = user.email.endsWith("@deleted.stayprimeph.local");
          const protectedAccount = user.role === "admin" || user.id === admin?.id || alreadyDeleted;
          return (
            <article key={user.id} className="rounded-[1.5rem] bg-white p-4 soft-card">
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-black/45">Name</span>
                  <span className={`text-right font-semibold ${alreadyDeleted ? "text-black/45" : ""}`}>{user.name}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-black/45">Email</span>
                  <span className={`text-right ${alreadyDeleted ? "text-black/45" : ""}`}>{user.email}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-black/45">Role</span>
                  <span className="capitalize">{user.role}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-black/45">Deletion request</span>
                  {requestBadge(deletionRequests.get(user.id))}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-black/10 pt-3">
                  <span className="text-black/45">Action</span>
                  <DeleteUserButton
                    userId={user.id}
                    userName={user.name}
                    userEmail={user.email}
                    disabled={protectedAccount}
                    disabledLabel={alreadyDeleted ? "Deleted" : "Protected"}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-[1.5rem] bg-white soft-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fbf7f2] text-black/55">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Deletion request</th>
                <th className="px-4 py-3 font-medium">Delete option</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const alreadyDeleted = user.email.endsWith("@deleted.stayprimeph.local");
                const protectedAccount = user.role === "admin" || user.id === admin?.id || alreadyDeleted;
                return (
                  <tr key={user.id} className="border-t align-top">
                    <td className={`px-4 py-4 font-medium ${alreadyDeleted ? "text-black/45" : ""}`}>{user.name}</td>
                    <td className={`px-4 py-4 ${alreadyDeleted ? "text-black/45" : ""}`}>{user.email}</td>
                    <td className="px-4 py-4 capitalize">{user.role}</td>
                    <td className="px-4 py-4 text-black/60">{user.phone || "Not set"}</td>
                    <td className="px-4 py-4">{requestBadge(deletionRequests.get(user.id))}</td>
                    <td className="px-4 py-4">
                      <DeleteUserButton
                        userId={user.id}
                        userName={user.name}
                        userEmail={user.email}
                        disabled={protectedAccount}
                        disabledLabel={alreadyDeleted ? "Deleted" : "Protected"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
