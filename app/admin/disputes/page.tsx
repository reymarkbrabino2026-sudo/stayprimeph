import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminDisputes } from "@/lib/admin-data";
import { adminLinks } from "@/lib/navigation";
import { formatDate } from "@/lib/utils";

export default async function AdminDisputesPage() {
  const disputes = await getAdminDisputes();

  return (
    <DashboardShell title="Disputes" subtitle="Admin dashboard" links={adminLinks}>
      {disputes.length === 0 ? (
        <EmptyState title="No open disputes" body="Chargebacks, cancellations, booking conflicts, and escalations will appear here." />
      ) : (
        <DataTable
          headers={["Case", "Booking", "Reason", "Status", "Created"]}
          rows={disputes.map((dispute) => [
            dispute.id,
            dispute.bookingId ?? "—",
            dispute.reason,
            <StatusBadge key={dispute.id} status={dispute.status} />,
            formatDate(dispute.createdAt),
          ])}
        />
      )}
    </DashboardShell>
  );
}
