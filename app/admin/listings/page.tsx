import Link from "next/link";
import { BedDouble, ExternalLink, Home, MapPin, Users } from "lucide-react";
import { ListingReviewActions } from "@/components/admin/listing-review-actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ResilientImage } from "@/components/ui/resilient-image";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminLinks } from "@/lib/navigation";
import { getCsrfToken } from "@/lib/csrf";
import { getProperties } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

const listingDateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminListingsPage() {
  const [properties, csrfToken] = await Promise.all([getProperties(), getCsrfToken()]);
  const pending = properties.filter((property) => property.status === "pending");
  const reviewed = properties.filter((property) => property.status !== "pending");

  return (
    <DashboardShell title="Listings Approval" subtitle="Admin dashboard" description="Approve new host listings before they become visible to guests." links={adminLinks}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Pending", pending.length],
          ["Approved", properties.filter((property) => property.status === "approved").length],
          ["Rejected", properties.filter((property) => property.status === "rejected").length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.5rem] bg-white p-5 soft-card">
            <p className="text-sm text-black/50">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Needs review</h2>
            <p className="text-sm text-black/55">Check photos, location, capacity, and pricing before publishing.</p>
          </div>
          <p className="text-sm font-semibold text-black/55">{pending.length} waiting</p>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed bg-white p-6 text-center text-sm text-black/55">
            No listings need approval right now.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {pending.map((property, index) => (
              <article key={property.id} className="rounded-[1.5rem] bg-white p-4 soft-card">
                <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <Link href={`/rooms/${property.id}`} target="_blank" rel="noreferrer" className="group relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100">
                    <ResilientImage src={property.images[0]?.imageUrl} alt={property.title} sizes="(min-width: 1280px) 18vw, (min-width: 640px) 28vw, 100vw" priority={index === 0} />
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow-sm">
                      <ExternalLink size={12} /> Preview
                    </span>
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-semibold leading-5">{property.title}</h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-black/55">
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">{formatPropertyLocation(property)}</span>
                        </p>
                      </div>
                      <StatusBadge status={property.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-black/55">
                      <span className="inline-flex items-center gap-1"><Home size={14} /> {property.propertyType}</span>
                      <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}</span>
                      <span className="inline-flex items-center gap-1"><Users size={14} /> {property.maxGuests} guest{property.maxGuests === 1 ? "" : "s"}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{formatCurrency(property.pricePerNight)} / night</p>
                        <p className="text-xs text-black/45">Submitted {listingDateFormatter.format(new Date(property.createdAt))}</p>
                      </div>
                      <ListingReviewActions listingId={property.id} csrfToken={csrfToken} variant="table" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-3 mt-8 text-xl font-bold">Review history</h2>
      <DataTable
        headers={["Listing", "Location", "Type", "Price", "Status"]}
        rows={reviewed.map((property) => [
          <Link key={`${property.id}-listing`} href={`/rooms/${property.id}`} target="_blank" rel="noreferrer" className="font-semibold underline-offset-4 hover:underline">
            {property.title}
          </Link>,
          formatPropertyLocation(property),
          property.propertyType,
          formatCurrency(property.pricePerNight),
          <StatusBadge key={`${property.id}-reviewed-status`} status={property.status} />,
        ])}
      />
    </DashboardShell>
  );
}
