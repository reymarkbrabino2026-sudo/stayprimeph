import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminPayments, getPlatformLedger } from "@/lib/admin-data";
import { adminLinks } from "@/lib/navigation";
import { formatPaymentMethod } from "@/lib/payments";
import { calculateHostPayoutFromTotal, calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  const [payments, platformLedger] = await Promise.all([getAdminPayments(), getPlatformLedger()]);
  const stayprimeBalance = platformLedger.reduce((sum, entry) => sum + entry.amount, 0);
  const bankedBalance = platformLedger.filter((entry) => entry.status === "banked").reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <DashboardShell title="Payments" subtitle="Admin dashboard" links={adminLinks}>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatsCard label="StayPrimePH balance" value={formatCurrency(stayprimeBalance)} />
        <StatsCard label="Added to bank" value={formatCurrency(bankedBalance)} />
        <StatsCard label="Paid transactions" value={String(payments.filter((payment) => payment.paymentStatus === "paid").length)} />
      </div>
      <DataTable
        headers={["Transaction", "Booking", "Method", "Amount", "StayPrimePH", "Host payout", "Status"]}
        rows={payments.map((payment) => [
          payment.transactionId,
          payment.bookingId,
          formatPaymentMethod(payment.paymentMethod),
          formatCurrency(payment.amount),
          payment.paymentStatus === "paid" ? formatCurrency(calculateStayprimeMarkupFromTotal(payment.amount)) : "-",
          payment.paymentStatus === "paid" ? formatCurrency(calculateHostPayoutFromTotal(payment.amount)) : "-",
          <StatusBadge key={payment.id} status={payment.paymentStatus} />,
        ])}
      />
    </DashboardShell>
  );
}
