import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ListingForm } from "@/components/forms/listing-form";
import { DeleteListingButton } from "@/components/forms/delete-listing-button";
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
          {(property.rooms?.length || property.bookingPackages?.length) ? (
            <div className="mt-6 space-y-4 border-t border-black/10 pt-5">
              {property.rooms?.length ? (
                <div>
                  <h3 className="font-semibold">Rooms</h3>
                  <div className="mt-3 grid gap-2">
                    {property.rooms.filter((room) => room.active).map((room) => (
                      <Info key={room.id} label={`${room.name} (${room.floor})`} value={`${room.capacity} pax`} />
                    ))}
                  </div>
                </div>
              ) : null}
              {property.bookingPackages?.length ? (
                <div>
                  <h3 className="font-semibold">Booking packages</h3>
                  <div className="mt-3 grid gap-2">
                    {property.bookingPackages.map((pkg) => (
                      <div key={pkg.id} className="rounded-2xl bg-[#fbf7f2] p-4 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{pkg.name}</p>
                            <p className="mt-1 text-black/55">{pkg.accessType}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black/60">{pkg.enabled ? "Enabled" : "Off"}</span>
                        </div>
                        <p className="mt-2 text-black/55">
                          {pkg.maxGuests} guests
                          {pkg.sleepingCapacity ? `, sleeps ${pkg.sleepingCapacity}` : ""}
                          {pkg.durationHours ? `, ${pkg.durationHours} hours` : ""}
                        </p>
                        {pkg.includedAmenities?.length ? <p className="mt-2 text-black/45">Includes: {pkg.includedAmenities.join(", ")}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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

      <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-red-800">Delete this listing</p>
          <p className="mt-1 text-sm text-red-700/80">Permanently remove this listing. Listings with active bookings can&apos;t be deleted.</p>
        </div>
        <DeleteListingButton listingId={property.id} csrfToken={csrfToken} />
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
