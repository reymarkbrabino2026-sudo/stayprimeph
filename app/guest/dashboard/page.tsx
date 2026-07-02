import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBookingsForGuest } from "@/lib/bookings";
import { guestLinks } from "@/lib/navigation";
import { getPaymentByBookingId } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

export default async function GuestDashboardPage() {
  const user = await getCurrentUser();
  const guestBookings = user ? await getBookingsForGuest(user.id) : [];
  const upcoming = guestBookings.find((booking) => booking.status === "confirmed");
  const [property, payment] = upcoming
    ? await Promise.all([getPropertyById(upcoming.propertyId), getPaymentByBookingId(upcoming.id)])
    : [null, null];
  const isPartiallyPaid = upcoming?.paymentStatus === "partially_paid";
  const remainingBalance = upcoming && payment ? Math.max(upcoming.totalPrice - payment.amount, 0) : 0;
  const stats = [
    ["Upcoming trips", String(guestBookings.filter((booking) => booking.status === "confirmed").length)],
    ["Saved homes", "0"],
    ["Past stays", String(guestBookings.filter((booking) => booking.status === "completed").length)],
  ];

  return (
    <DashboardShell title="Guest Overview" subtitle="Guest dashboard" links={guestLinks}>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(([label, value]) => (
          <StatsCard key={label} label={label} value={value} />
        ))}
      </div>
      <div className="mt-6 rounded-[1.5rem] bg-white p-4 soft-card sm:rounded-[1.75rem] sm:p-6">
        <h2 className="text-xl font-bold">Upcoming stay</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {property && upcoming ? (
            <div className="min-w-0 text-black/60">
              <p>{property.title} - {formatStayDateRange(upcoming.checkIn, upcoming.checkOut)}</p>
              <p className="mt-1 text-sm text-black/45">{formatStayTimeRange()}</p>
              {isPartiallyPaid ? (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Partially paid. Balance {formatCurrency(remainingBalance)} due upon check-in.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-black/60">No upcoming stay yet.</p>
          )}
          {upcoming ? (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <StatusBadge status={upcoming.status} />
              <StatusBadge status={upcoming.paymentStatus} />
            </div>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
