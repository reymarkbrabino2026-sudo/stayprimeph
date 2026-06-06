import { approveListing, rejectListing } from "@/app/admin/listings/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getBookings } from "@/lib/bookings";
import { adminLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";

export default async function AdminDashboardPage() {
  const [bookings, properties] = await Promise.all([getBookings(), getProperties()]);
  const pendingListings = properties.filter((property) => property.status === "pending");
  const approvedListings = properties.filter((property) => property.status === "approved");
  const stats = [
    ["Pending listings", String(pendingListings.length)],
    ["Approved listings", String(approvedListings.length)],
    ["Open bookings", String(bookings.filter((booking) => booking.status === "pending").length)],
    ["Gross booking value", `₱${bookings.reduce((sum, booking) => sum + booking.totalPrice, 0).toLocaleString()}`],
  ];

  return (
    <DashboardShell title="Admin Overview" subtitle="Admin dashboard" links={adminLinks}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => <StatsCard key={label} label={label} value={value} />)}
      </div>

      <section className="mt-6 rounded-[1.75rem] bg-white p-4 soft-card sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Approval queue</p>
            <h2 className="mt-2 text-2xl font-bold">Listings waiting for review</h2>
          </div>
          <p className="text-sm text-black/55">{pendingListings.length} pending</p>
        </div>

        {pendingListings.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed p-8 text-center text-black/55">No listings need approval right now.</div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {pendingListings.map((property) => (
              <article key={property.id} className="rounded-3xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{property.title}</h3>
                    <p className="mt-1 text-sm text-black/55">{formatPropertyLocation(property)} · {property.propertyType}</p>
                  </div>
                  <StatusBadge status={property.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-black/65">{property.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-black/55">
                  <span className="rounded-full bg-black/[0.04] px-3 py-1">{property.maxGuests} guests</span>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1">{property.bedrooms} bedrooms</span>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1">₱{property.pricePerNight.toLocaleString()}/night</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <form action={approveListing} className="flex-1">
                    <input type="hidden" name="id" value={property.id} />
                    <button className="min-h-11 w-full rounded-full bg-black px-4 font-semibold text-white transition hover:bg-black/85">Approve</button>
                  </form>
                  <form action={rejectListing} className="flex-1">
                    <input type="hidden" name="id" value={property.id} />
                    <button className="min-h-11 w-full rounded-full border border-black/10 px-4 font-semibold transition hover:border-black/30 hover:bg-black/[0.02]">Reject</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
