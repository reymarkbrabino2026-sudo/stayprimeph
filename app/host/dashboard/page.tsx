import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccountSettings } from "@/lib/account-settings";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookingsForHost } from "@/lib/bookings";
import { readHostExpenses } from "@/lib/host-expense-store";
import { getHostFinancialMonthSummary, getHostFinancialYearSummary } from "@/lib/host-financials";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { hostLinks } from "@/lib/navigation";
import { paidAvailabilityBlocksForProperties } from "@/lib/paid-availability-blocks";
import { getPropertiesForHost } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

// Always render fresh so the earnings/net-profit figures reflect the latest
// bookings, sales, and expenses on every load (no route or data caching).
export const dynamic = "force-dynamic";

export default async function HostDashboardPage() {
  const user = await getCurrentUser();
  const hostId = user?.id ?? "";
  const [hostBookings, hostListings, availabilityBlocks, accountSettings, allReports, allExpenses] = await Promise.all([
    hostId ? getBookingsForHost(hostId) : Promise.resolve([]),
    hostId ? getPropertiesForHost(hostId) : Promise.resolve([]),
    hostId ? getAvailabilityBlocks() : Promise.resolve([]),
    user ? getAccountSettings(user) : Promise.resolve(null),
    hostId ? readHostMonthlyReports() : Promise.resolve([]),
    hostId ? readHostExpenses() : Promise.resolve([]),
  ]);
  const hostReports = allReports.filter((report) => report.hostId === hostId);
  const hostExpenses = allExpenses.filter((expense) => expense.hostId === hostId);
  const upcomingBookings = hostBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed");
  const paidBlocks = paidAvailabilityBlocksForProperties(availabilityBlocks, hostListings);
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcomingExternalBlocks = paidBlocks.filter((block) => block.date >= todayKey);
  const upcomingBookingPreview = upcomingBookings.slice(0, 3);
  const externalBlockPreview = upcomingExternalBlocks.slice(0, Math.max(0, 3 - upcomingBookingPreview.length));
  const upcomingReservationCount = upcomingBookings.length + upcomingExternalBlocks.length;
  const hasPayoutMethod = Boolean(accountSettings?.financial.payoutMethods.length);
  // Total revenue for the current month (paid bookings + external blocks + manual
  // sales), matching the ERP "Total Revenue (MTD)" and Host Reports for the month.
  const currentMonthKey = todayKey.slice(0, 7);
  const monthSummary = getHostFinancialMonthSummary({
    bookings: hostBookings,
    expenses: hostExpenses,
    month: currentMonthKey,
    paidBlocks,
    reports: hostReports,
  });
  const monthRevenue = monthSummary.income;
  // Whole-year figures. Total revenue is the sum of each month's Total Revenue, and
  // net profit is the sum of each month's net income, so both reconcile with the
  // per-month ERP / Reports figures (a loss month lowers the net profit).
  const currentYearKey = todayKey.slice(0, 4);
  const yearSummary = getHostFinancialYearSummary({
    bookings: hostBookings,
    expenses: hostExpenses,
    paidBlocks,
    reports: hostReports,
    year: currentYearKey,
  });
  const yearRevenue = yearSummary.income;
  const netProfitYear = yearSummary.netIncome;

  return (
    <DashboardShell
      title="Host Overview"
      subtitle="Host dashboard"
      description="Track reservations, listing approvals, and payout readiness from one place."
      links={hostLinks}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard label="Listings" value={String(hostListings.length)} />
        <StatsCard description="Includes paid blocked dates marked as guest or external bookings." label="Upcoming bookings" value={String(upcomingReservationCount)} />
        <StatsCard description="Paid bookings, external blocks, and manual sales for this month." label="Total revenue this month" value={formatCurrency(monthRevenue)} />
        <StatsCard description={`Paid bookings, external blocks, and manual sales for all of ${currentYearKey}.`} label="Total revenue this year" value={formatCurrency(yearRevenue)} />
        <StatsCard description={`Total revenue for ${currentYearKey} minus recorded expenses.`} label="Net profit this year" value={formatCurrency(netProfitYear)} />
      </div>

      {!hasPayoutMethod ? (
        <section className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800/70">Payout setup</p>
              <h2 className="mt-2 text-xl font-bold text-amber-950">Add where StayPrimePH should send your payouts</h2>
              <p className="mt-1 text-sm text-amber-950/70">Hosts need a payout method before approved earnings can be sent.</p>
            </div>
            <Link href="/host/payouts" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#21170f] px-5 text-sm font-semibold text-white sm:w-fit">
              Set up payout method
            </Link>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[1.75rem] bg-white p-5 soft-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Reservations</p>
              <h2 className="mt-2 text-2xl font-bold">Upcoming requests</h2>
            </div>
            <Link href="/host/bookings" className="shrink-0 text-sm font-semibold text-[#d85d32]">View all</Link>
          </div>
          {upcomingReservationCount === 0 ? (
            <div className="mt-5">
              <EmptyState title="No reservations yet" body="Once guests book your places, requests and confirmed trips will appear here." />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {upcomingBookingPreview.map((booking) => {
                const property = hostListings.find((item) => item.id === booking.propertyId);
                return (
                  <article key={booking.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{property?.title ?? "Property"}</h3>
                        <p className="mt-1 text-sm text-black/55">{formatStayDateRange(booking.checkIn, booking.checkOut)} - {booking.guests} guests</p>
                        <p className="mt-1 text-xs text-black/45">{formatStayTimeRange()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <StatusBadge status={booking.status} />
                        <StatusBadge status={booking.paymentStatus} />
                      </div>
                    </div>
                  </article>
                );
              })}
              {externalBlockPreview.map((block) => (
                <article key={block.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{block.propertyTitle}</h3>
                      <p className="mt-1 text-sm text-black/55">{formatStayDateRange(block.checkIn, block.checkOut)}</p>
                      {block.bookingPackageName ? <p className="mt-1 text-xs text-black/45">{block.bookingPackageName}</p> : null}
                      <p className="mt-1 text-xs font-semibold text-emerald-700">{formatCurrency(block.totalPrice)} external paid block</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{block.reasonLabel}</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Paid</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 soft-card">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Listings</p>
          <h2 className="mt-2 text-2xl font-bold">Approval status</h2>
          <div className="mt-5 space-y-3">
            {hostListings.length === 0 ? (
              <EmptyState title="Create your first listing" body="Publish a place for admin review before guests can book it." />
            ) : (
              hostListings.slice(0, 4).map((property) => (
                <div key={property.id} className="flex flex-col gap-3 rounded-2xl bg-[#fbf7f2] p-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{property.title}</p>
                    <p className="text-sm text-black/55">{formatPropertyLocation(property)}</p>
                  </div>
                  <StatusBadge status={property.status} />
                </div>
              ))
            )}
          </div>
          <Link href="/host/listings/create" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white sm:w-auto">
            Create listing
          </Link>
        </section>
      </div>
    </DashboardShell>
  );
}
