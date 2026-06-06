import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { adminLinks } from "@/lib/navigation";
import { getUsers } from "@/lib/users";

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <DashboardShell title="Users" subtitle="Admin dashboard" links={adminLinks}>
      <DataTable headers={["Name", "Email", "Role", "Phone"]} rows={users.map((user) => [user.name, user.email, user.role, user.phone])} />
    </DashboardShell>
  );
}
