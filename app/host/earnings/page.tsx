import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { getAccountSettings } from "@/lib/account-settings";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { hostLinks } from "@/lib/navigation";
import { paidAvailabilityBlocksForProperties } from "@/lib/paid-availability-blocks";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import { getPropertiesForHost } from "@/lib/properties";
import { formatCurrency } from "@/lib/utils";

export default async function HostEarningsPage() {
  const user = await getCurrentUser();
  const hostId = user?.id ?? "";
  const [allBookings, hostListings, availabilityBlocks, accountSettings] = await Promise.all([
    getBookings(),
    hostId ? getPropertiesForHost(hostId) : Promise.resolve([]),
    hostId ? getAvailabilityBlocks() : Promise.resolve([]),
    user ? getAccountSettings(user) : Promise.resolve(null),
  ]);
  const bookings = allBookings.filter((booking) => booking.hostId === user?.id);
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");
  const pendingBookings = bookings.filter((booking) => booking.status !== "cancelled" && booking.paymentStatus !== "paid");
  const paidBlocks = paidAvailabilityBlocksForProperties(availabilityBlocks, hostListings);
  const externalPaidTotal = paidBlocks.reduce((sum, block) => sum + block.totalPrice, 0);
  const paidTotal = paidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0) + externalPaidTotal;
  const pendingTotal = pendingBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const paidRecordCount = paidBookings.length + paidBlocks.length;
  const averageBookingValue = paidRecordCount ? Math.round(paidTotal / paidRecordCount) : 0;
  const payoutMethod = accountSettings?.financial.payoutMethods[0] ?? null;
  const payoutLabel = payoutMethod
    ? `${payoutMethod.bankName || payoutMethod.type} payout account`
    : "No payout method";

  return (
    <DashboardShell title="Earnings" subtitle="Host dashboard" links={hostLinks}>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard description="Includes paid blocked dates recorded outside StayPrimePH." label="Paid earnings" value={formatCurrency(paidTotal)} />
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
