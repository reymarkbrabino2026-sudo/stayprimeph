import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { guestLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

export default async function GuestDashboardPage() {
  const user = await getCurrentUser();
  const [bookings, properties] = await Promise.all([getBookings(), getProperties()]);
  const guestBookings = bookings.filter((booking) => booking.guestId === user?.id);
  const upcoming = guestBookings.find((booking) => booking.status === "confirmed");
  const property = properties.find((item) => item.id === upcoming?.propertyId);
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
      <div className="mt-6 rounded-[1.75rem] bg-white p-6 soft-card">
        <h2 className="text-xl font-bold">Upcoming stay</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {property && upcoming ? (
            <div className="text-black/60">
              <p>{property.title} - {formatStayDateRange(upcoming.checkIn, upcoming.checkOut)}</p>
              <p className="mt-1 text-sm text-black/45">{formatStayTimeRange()}</p>
            </div>
          ) : (
            <p className="text-black/60">No upcoming stay yet.</p>
          )}
          {upcoming ? <StatusBadge status={upcoming.status} /> : null}
        </div>
      </div>
    </DashboardShell>
  );
}
