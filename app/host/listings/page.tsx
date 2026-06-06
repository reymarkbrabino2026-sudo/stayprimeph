import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ResilientImage } from "@/components/ui/resilient-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { hostLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

export default async function HostListingsPage() {
  const user = await getCurrentUser();
  const properties = (await getProperties()).filter((property) => property.hostId === user?.id);

  return (
    <DashboardShell title="My Listings" subtitle="Host dashboard" description="Manage listing status, pricing, and edits." links={hostLinks}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label="Total" value={properties.length} />
          <Summary label="Approved" value={properties.filter((property) => property.status === "approved").length} />
          <Summary label="Pending" value={properties.filter((property) => property.status === "pending").length} />
        </div>
        <Link href="/host/listings/create" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white">
          <Plus size={16} /> Add listing
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState title="No listings yet" body="Create your first property listing and submit it for admin approval." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property, index) => {
            const cover = property.images[0]?.imageUrl;
            return (
              <Link key={property.id} href={`/host/listings/${property.id}`} className="block rounded-[1.75rem] bg-white p-4 soft-card transition hover:-translate-y-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100">
                  <ResilientImage src={cover} alt={property.title} sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" priority={index === 0} />
                  <span className="absolute left-3 top-3"><StatusBadge status={property.status} /></span>
                </div>
                <h2 className="mt-4 font-semibold">{property.title}</h2>
                <p className="mt-1 text-sm text-black/55">{property.propertyType} in {formatPropertyLocation(property)}</p>
                <p className="mt-3 text-sm font-semibold">{formatCurrency(property.pricePerNight)} / night</p>
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
    <div className="rounded-2xl bg-white px-4 py-3 soft-card">
      <p className="text-xs text-black/45">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
