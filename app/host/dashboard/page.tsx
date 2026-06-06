import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { hostLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function HostDashboardPage() {
  const user = await getCurrentUser();
  const [bookings, properties] = await Promise.all([getBookings(), getProperties()]);
  const hostListings = properties.filter((property) => property.hostId === user?.id);
  const hostBookings = bookings.filter((booking) => booking.hostId === user?.id);
  const upcomingBookings = hostBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed");
  const paidTotal = hostBookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + booking.totalPrice, 0);

  return (
    <DashboardShell
      title="Host Overview"
      subtitle="Host dashboard"
      description="Track reservations, listing approvals, and payout readiness from one place."
      links={hostLinks}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Listings" value={String(hostListings.length)} />
        <StatsCard label="Upcoming bookings" value={String(upcomingBookings.length)} />
        <StatsCard label="Paid earnings" value={formatCurrency(paidTotal)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[1.75rem] bg-white p-5 soft-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Reservations</p>
              <h2 className="mt-2 text-2xl font-bold">Upcoming requests</h2>
            </div>
            <Link href="/host/bookings" className="text-sm font-semibold text-[#d85d32]">View all</Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="No reservations yet" body="Once guests book your places, requests and confirmed trips will appear here." />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {upcomingBookings.slice(0, 3).map((booking) => {
                const property = properties.find((item) => item.id === booking.propertyId);
                return (
                  <article key={booking.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{property?.title ?? "Property"}</h3>
                        <p className="mt-1 text-sm text-black/55">{formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} · {booking.guests} guests</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusBadge status={booking.status} />
                        <StatusBadge status={booking.paymentStatus} />
                      </div>
                    </div>
                  </article>
                );
              })}
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
                <div key={property.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#fbf7f2] p-4">
                  <div>
                    <p className="font-semibold">{property.title}</p>
                    <p className="text-sm text-black/55">{formatPropertyLocation(property)}</p>
                  </div>
                  <StatusBadge status={property.status} />
                </div>
              ))
            )}
          </div>
          <Link href="/host/listings/create" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">
            Create listing
          </Link>
        </section>
      </div>
    </DashboardShell>
  );
}
