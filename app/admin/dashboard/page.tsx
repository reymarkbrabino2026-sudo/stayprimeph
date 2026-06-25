import { ListingReviewActions } from "@/components/admin/listing-review-actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminDashboardSummary } from "@/lib/admin-data";
import { getCsrfToken } from "@/lib/csrf";
import { adminLinks } from "@/lib/navigation";
import { getPropertiesByStatus } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";

function formatPesoValue(value: number) {
  return `PHP ${value.toLocaleString()}`;
}

export default async function AdminDashboardPage() {
  const [summary, pendingListings, csrfToken] = await Promise.all([getAdminDashboardSummary(), getPropertiesByStatus("pending"), getCsrfToken()]);
  const stats = [
    ["Pending listings", String(summary.pendingListings)],
    ["Approved listings", String(summary.approvedListings)],
    ["Open bookings", String(summary.openBookings)],
    ["Gross booking value", formatPesoValue(summary.grossBookingValue)],
    ["StayPrimePH earnings", formatPesoValue(summary.stayprimeEarningsValue)],
  ];

  return (
    <DashboardShell title="Admin Overview" subtitle="Admin dashboard" links={adminLinks}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                    <p className="mt-1 text-sm text-black/55">{formatPropertyLocation(property)} - {property.propertyType}</p>
                  </div>
                  <StatusBadge status={property.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-black/65">{property.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-black/55">
                  <span className="rounded-full bg-black/[0.04] px-3 py-1">{property.maxGuests} guests</span>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1">{property.bedrooms} bedrooms</span>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1">PHP {property.pricePerNight.toLocaleString()}/night</span>
                </div>
                <ListingReviewActions listingId={property.id} csrfToken={csrfToken} />
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
