import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminReports } from "@/lib/admin-data";
import { adminLinks } from "@/lib/navigation";
import { formatDate } from "@/lib/utils";

export default async function AdminReportsPage() {
  const reports = await getAdminReports();

  return (
    <DashboardShell title="Reports" subtitle="Admin dashboard" links={adminLinks}>
      {reports.length === 0 ? (
        <EmptyState title="No urgent reports" body="Guest and host reports will appear here when moderation cases are submitted." />
      ) : (
        <DataTable
          headers={["Type", "Status", "Details", "Created"]}
          rows={reports.map((report) => [
            report.type.replaceAll("_", " "),
            <StatusBadge key={report.id} status={report.status} />,
            report.details,
            formatDate(report.createdAt),
          ])}
        />
      )}
    </DashboardShell>
  );
}
