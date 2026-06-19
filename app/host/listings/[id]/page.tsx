import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ListingForm } from "@/components/forms/listing-form";
import { ResilientImage } from "@/components/ui/resilient-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";
import { hostLinks } from "@/lib/navigation";
import { getPropertyById } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> }) {
  const [{ id }, query, user, csrfToken] = await Promise.all([params, searchParams, getCurrentUser(), getCsrfToken()]);
  const property = await getPropertyById(id);
  if (!property || property.hostId !== user?.id) notFound();

  const cover = property.images[0]?.imageUrl;

  return (
    <DashboardShell title="Listing Details" subtitle="Host dashboard" description="Review the listing guests and admins will see." links={hostLinks}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] bg-white p-4 soft-card">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100">
            <ResilientImage src={cover} alt={property.title} sizes="(min-width: 1024px) 40vw, 100vw" priority />
            <span className="absolute left-3 top-3"><StatusBadge status={property.status} /></span>
          </div>
          <h2 className="mt-4 text-2xl font-bold">{property.title}</h2>
          <p className="mt-2 text-black/60">{property.address}, {formatPropertyLocation(property)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Info label="Nightly price" value={formatCurrency(property.pricePerNight)} />
            <Info label="Guests" value={String(property.maxGuests)} />
            <Info label="Bedrooms" value={String(property.bedrooms)} />
            <Info label="Bathrooms" value={String(property.bathrooms)} />
          </div>
          <p className="mt-5 leading-7 text-black/65">{property.description}</p>
        </section>

        <section>
          {query.updated === "1" ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Listing updated successfully.
            </div>
          ) : null}
          <ListingForm mode="Edit" property={property} csrfToken={csrfToken} />
        </section>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fbf7f2] p-4">
      <p className="text-xs text-black/45">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
