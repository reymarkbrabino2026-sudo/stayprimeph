import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BedDouble, ChevronRight, Home, MapPin, Plus, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HostDraftCleaner } from "@/components/host-wizard/host-draft-cleaner";
import { EmptyState } from "@/components/ui/empty-state";
import { ResilientImage } from "@/components/ui/resilient-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { hostLinks } from "@/lib/navigation";
import { getPropertiesForHost } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

const listingDateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export default async function HostListingsPage({ searchParams }: { searchParams: Promise<{ deleted?: string; published?: string }> }) {
  noStore();

  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const properties = user ? await getPropertiesForHost(user.id) : [];
  const approvedCount = properties.filter((property) => property.status === "approved").length;
  const pendingCount = properties.filter((property) => property.status === "pending").length;
  const draftCount = properties.filter((property) => property.status === "draft").length;
  const rejectedCount = properties.filter((property) => property.status === "rejected").length;

  return (
    <DashboardShell title="My Listings" subtitle="Host dashboard" description="Manage listing status, pricing, and edits." links={hostLinks}>
      <HostDraftCleaner enabled={query.published === "1"} userId={user?.id} />
      {query.deleted === "1" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Listing deleted successfully.
        </div>
      ) : null}
      <div className="mb-6 rounded-[1.5rem] border border-black/10 bg-white p-4 soft-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Total listings" value={properties.length} />
            <Summary label="Live" value={approvedCount} />
            <Summary label="Pending review" value={pendingCount} />
            <Summary label="Drafts/rejected" value={draftCount + rejectedCount} />
          </div>
          <Link href="/host/listings/create" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/85">
            <Plus size={16} /> Add listing
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-[1.5rem] bg-white p-6 soft-card">
          <EmptyState title="No listings yet" body="Create your first property listing and submit it for admin approval." />
          <div className="mt-5 flex justify-center">
            <Link href="/host/listings/create" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white">
              <Plus size={16} /> Add listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property, index) => {
            const cover = property.images[0]?.imageUrl;
            const createdAt = listingDateFormatter.format(new Date(property.createdAt));
            const typeLabel = property.propertyType
              ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
              : "Stay";
            return (
              <Link key={property.id} href={`/host/listings/${property.id}`} className="group block rounded-[1.5rem] bg-white p-4 soft-card transition hover:-translate-y-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100">
                  <ResilientImage src={cover} alt={property.title} sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" priority={index === 0} />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
                  <span className="absolute left-3 top-3"><StatusBadge status={property.status} /></span>
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow-sm">
                    <Home size={13} /> {typeLabel}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 font-semibold leading-5">{property.title}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-black/55">
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{formatPropertyLocation(property)}</span>
                      </p>
                    </div>
                    <ChevronRight size={18} className="mt-0.5 shrink-0 text-black/35 transition group-hover:translate-x-0.5 group-hover:text-black/65" />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-black/55">
                    <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}</span>
                    <span className="inline-flex items-center gap-1"><Users size={14} /> {property.maxGuests} guest{property.maxGuests === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3 border-t border-black/10 pt-3">
                    <p className="text-sm text-black/55">Created {createdAt}</p>
                    <p className="text-sm font-semibold">{formatCurrency(property.pricePerNight)} / night</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#fbf7f2] px-4 py-3">
      <p className="text-xs text-black/45">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
