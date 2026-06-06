import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminPayments } from "@/lib/admin-data";
import { adminLinks } from "@/lib/navigation";
import { formatPaymentMethod } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  const payments = await getAdminPayments();

  return (
    <DashboardShell title="Payments" subtitle="Admin dashboard" links={adminLinks}>
      <DataTable
        headers={["Transaction", "Booking", "Method", "Amount", "Status"]}
        rows={payments.map((payment) => [
          payment.transactionId,
          payment.bookingId,
          formatPaymentMethod(payment.paymentMethod),
          formatCurrency(payment.amount),
          <StatusBadge key={payment.id} status={payment.paymentStatus} />,
        ])}
      />
    </DashboardShell>
  );
}
