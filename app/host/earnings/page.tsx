import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { hostLinks } from "@/lib/navigation";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export default async function HostEarningsPage() {
  const user = await getCurrentUser();
  const [allBookings, accountSettings] = await Promise.all([
    getBookings(),
    user ? getAccountSettings(user) : Promise.resolve(null),
  ]);
  const bookings = allBookings.filter((booking) => booking.hostId === user?.id);
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");
  const pendingBookings = bookings.filter((booking) => booking.status !== "cancelled" && booking.paymentStatus !== "paid");
  const paidTotal = paidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const pendingTotal = pendingBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const averageBookingValue = paidBookings.length ? Math.round(paidTotal / paidBookings.length) : 0;
  const payoutMethod = accountSettings?.financial.payoutMethods[0] ?? null;
  const payoutLabel = payoutMethod
    ? `${payoutMethod.type} ending in ${payoutMethod.accountLast4.replace(/\D/g, "").slice(-4)}`
    : "No payout method";

  return (
    <DashboardShell title="Earnings" subtitle="Host dashboard" links={hostLinks}>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="This month" value={formatCurrency(paidTotal)} />
        <StatsCard label="Pending payout" value={formatCurrency(pendingTotal)} />
        <StatsCard label="Average booking value" value={formatCurrency(averageBookingValue)} />
      </div>

      <section className="mt-6 rounded-[1.75rem] bg-white p-5 soft-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Payout method</p>
            <h2 className="mt-2 text-2xl font-bold">{payoutLabel}</h2>
            <p className="mt-1 text-sm text-black/60">
              {payoutMethod
                ? `StayPrimePH will send approved payouts to ${payoutMethod.bankName}.`
                : "Add a receiving account so StayPrimePH can send approved host payouts."}
            </p>
          </div>
          <Link href="/host/payouts" className="inline-flex min-h-11 w-fit items-center rounded-full bg-[#21170f] px-5 text-sm font-semibold text-white">
            {payoutMethod ? "Manage payouts" : "Set up payouts"}
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
