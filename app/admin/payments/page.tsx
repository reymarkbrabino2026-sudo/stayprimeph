import { rejectSubmittedPayment, verifySubmittedPayment } from "@/app/admin/payments/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminPayments, getPlatformLedger } from "@/lib/admin-data";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { adminLinks } from "@/lib/navigation";
import { formatPaymentMethod } from "@/lib/payments";
import { calculateHostPayoutFromTotal, calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  const [payments, platformLedger, csrfToken] = await Promise.all([getAdminPayments(), getPlatformLedger(), getCsrfToken()]);
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
        headers={["Transaction", "Booking", "Method", "Amount", "StayPrimePH", "Host payout", "Status", "Actions"]}
        rows={payments.map((payment) => [
          payment.transactionId,
          payment.bookingId,
          formatPaymentMethod(payment.paymentMethod),
          formatCurrency(payment.amount),
          payment.paymentStatus === "paid" ? formatCurrency(calculateStayprimeMarkupFromTotal(payment.amount)) : "-",
          payment.paymentStatus === "paid" ? formatCurrency(calculateHostPayoutFromTotal(payment.amount)) : "-",
          <StatusBadge key={payment.id} status={payment.paymentStatus} />,
          payment.paymentStatus === "submitted" ? (
            <div key={`${payment.id}-actions`} className="flex min-w-56 flex-col gap-2">
              <form action={verifySubmittedPayment}>
                <input type="hidden" name={csrfFieldName} value={csrfToken} />
                <input type="hidden" name="bookingId" value={payment.bookingId} />
                <button className="min-h-10 w-full rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
                  Verify payment
                </button>
              </form>
              <form action={rejectSubmittedPayment} className="space-y-2">
                <input type="hidden" name={csrfFieldName} value={csrfToken} />
                <input type="hidden" name="bookingId" value={payment.bookingId} />
                <input
                  name="rejectionReason"
                  placeholder="Reason for rejection"
                  className="min-h-10 w-full rounded-xl border px-3 text-xs"
                  required
                />
                <button className="min-h-10 w-full rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700">
                  Reject payment
                </button>
              </form>
            </div>
          ) : (
            <span key={`${payment.id}-no-actions`} className="text-sm text-black/45">No action</span>
          ),
        ])}
      />
    </DashboardShell>
  );
}
