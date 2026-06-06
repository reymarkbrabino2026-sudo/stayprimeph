import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { adminLinks } from "@/lib/navigation";
import { getUsers } from "@/lib/users";

export default async function AdminHostsPage() {
  const users = await getUsers();
  const hosts = users.filter((user) => user.role === "host");

  return (
    <DashboardShell title="Hosts" subtitle="Admin dashboard" links={adminLinks}>
      <DataTable headers={["Name", "Email", "Phone"]} rows={hosts.map((host) => [host.name, host.email, host.phone])} />
    </DashboardShell>
  );
}
