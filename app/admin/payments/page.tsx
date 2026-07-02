import { recordPayout, rejectSubmittedPayment, verifySubmittedPayment } from "@/app/admin/payments/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminPayments, getPlatformLedger } from "@/lib/admin-data";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { adminLinks } from "@/lib/navigation";
import { formatPaymentMethod } from "@/lib/payments";
import { getHostPayoutQueue } from "@/lib/payouts";
import { calculateHostPayoutFromTotal, calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminPaymentsPage() {
  const [payments, platformLedger, payoutQueue, csrfToken] = await Promise.all([getAdminPayments(), getPlatformLedger(), getHostPayoutQueue(), getCsrfToken()]);
  const stayprimeBalance = platformLedger.reduce((sum, entry) => sum + entry.amount, 0);
  const bankedBalance = platformLedger.filter((entry) => entry.status === "banked").reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <DashboardShell title="Payments" subtitle="Admin dashboard" links={adminLinks}>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatsCard label="StayPrimePH balance" value={formatCurrency(stayprimeBalance)} />
        <StatsCard label="Added to bank" value={formatCurrency(bankedBalance)} />
        <StatsCard label="Paid transactions" value={String(payments.filter((payment) => payment.paymentStatus === "paid").length)} />
      </div>
      <section className="mb-6 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 p-4">
          <h2 className="font-semibold">Host payouts</h2>
          <span className="text-sm text-black/50">{payoutQueue.length} transaction{payoutQueue.length === 1 ? "" : "s"} owed</span>
        </div>
        {payoutQueue.length === 0 ? (
          <p className="p-4 text-sm text-black/55">No transaction payouts are due right now.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {payoutQueue.map((entry) => (
              <li key={`${entry.bookingId}-${entry.paymentId ?? "booking"}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{entry.host.name}</p>
                  <p className="break-all text-sm text-black/50">{entry.host.email}</p>
                  <p className="mt-1 break-words text-sm text-black/60">
                    Booking {entry.bookingId}{entry.transactionId ? ` - Ref ${entry.transactionId}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-black/60">
                    Guest paid {formatCurrency(entry.guestPaidTotal)} - StayPrimePH 20% {formatCurrency(entry.stayprimeMarkup)} - Host payout {formatCurrency(entry.hostPayout)}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                    Received {formatDateTime(entry.receivedAt)} - Target by {formatDateTime(entry.targetPayoutBy)}
                  </p>
                </div>
                {entry.status === "available" ? (
                  <form action={recordPayout} className="flex w-full items-center gap-2 sm:w-auto">
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="hostId" value={entry.host.id} />
                    <input type="hidden" name="bookingId" value={entry.bookingId} />
                    {entry.paymentId ? <input type="hidden" name="paymentId" value={entry.paymentId} /> : null}
                    <input type="hidden" name="amount" value={entry.hostPayout} />
                    <button className="min-h-10 w-full shrink-0 rounded-full bg-[#083f35] px-4 text-xs font-semibold text-white sm:w-auto">Record transaction payout</button>
                  </form>
                ) : (
                  <span className="text-sm text-black/45">Clearing</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <DataTable
        headers={["Transaction", "Booking", "Method", "Amount", "StayPrimePH", "Host payout", "Status", "Actions"]}
        rows={payments.map((payment) => [
          <div key={`${payment.id}-transaction`} className="min-w-44 space-y-1">
            <p className="break-words font-semibold">{payment.transactionId}</p>
            {payment.receiptImageUrl ? (
              <a
                href={payment.receiptImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-semibold text-[#d85d32]"
              >
                View receipt
              </a>
            ) : null}
          </div>,
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
