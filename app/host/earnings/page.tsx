import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { hostLinks } from "@/lib/navigation";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";

export default async function HostEarningsPage() {
  const user = await getCurrentUser();
  const bookings = (await getBookings()).filter((booking) => booking.hostId === user?.id);
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");
  const pendingBookings = bookings.filter((booking) => booking.status !== "cancelled" && booking.paymentStatus !== "paid");
  const paidTotal = paidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const pendingTotal = pendingBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const averageBookingValue = paidBookings.length ? Math.round(paidTotal / paidBookings.length) : 0;

  return (
    <DashboardShell title="Earnings" subtitle="Host dashboard" links={hostLinks}>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="This month" value={`₱${paidTotal.toLocaleString()}`} />
        <StatsCard label="Pending payout" value={`₱${pendingTotal.toLocaleString()}`} />
        <StatsCard label="Average booking value" value={`₱${averageBookingValue.toLocaleString()}`} />
      </div>
    </DashboardShell>
  );
}
