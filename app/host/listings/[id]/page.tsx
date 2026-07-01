import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BookingPackageEditor } from "@/components/forms/booking-package-editor";
import { ListingForm } from "@/components/forms/listing-form";
import { DeleteListingButton } from "@/components/forms/delete-listing-button";
import { ResilientImage } from "@/components/ui/resilient-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";
import { hostLinks } from "@/lib/navigation";
import { isEntirePlaceListing } from "@/lib/pricing";
import { getPropertyById } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> }) {
  const [{ id }, query, user, csrfToken] = await Promise.all([params, searchParams, getCurrentUser(), getCsrfToken()]);
  const property = await getPropertyById(id);
  if (!property || property.hostId !== user?.id) notFound();

  const cover = property.images[0]?.imageUrl;
  const wholePlaceAccessEnabled = isEntirePlaceListing(property);
  const visibleRooms = wholePlaceAccessEnabled ? property.rooms?.filter((room) => room.active) ?? [] : [];
  const editFormId = `listing-edit-${property.id}`;

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
          {(visibleRooms.length || wholePlaceAccessEnabled) ? (
            <div className="mt-6 space-y-4 border-t border-black/10 pt-5">
              {visibleRooms.length ? (
                <div>
                  <h3 className="font-semibold">Rooms</h3>
                  <div className="mt-3 grid gap-2">
                    {visibleRooms.map((room) => (
                      <RoomPaxInput key={room.id} formId={editFormId} room={room} />
                    ))}
                  </div>
                </div>
              ) : null}
              {wholePlaceAccessEnabled ? <BookingPackageEditor property={property} formId={editFormId} /> : null}
            </div>
          ) : null}
        </section>

        <section>
          {query.updated === "1" ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Listing updated successfully.
            </div>
          ) : null}
          <ListingForm mode="Edit" property={property} csrfToken={csrfToken} formId={editFormId} />
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

function RoomPaxInput({
  formId,
  room,
}: {
  formId: string;
  room: { id: string; name: string; floor: string; capacity: number };
}) {
  return (
    <div className="rounded-2xl bg-[#fbf7f2] p-4">
      <p className="text-xs text-black/45">{room.name} ({room.floor})</p>
      <label className="mt-1 flex max-w-28 items-center gap-2">
        <input
          form={formId}
          name={`roomCapacity:${room.id}`}
          type="number"
          min={1}
          max={100}
          defaultValue={room.capacity}
          required
          aria-label={`${room.name} pax`}
          className="min-h-9 w-16 rounded-lg border border-black/10 bg-white px-2 font-semibold outline-none transition focus:border-black"
        />
        <span className="font-semibold">pax</span>
      </label>
    </div>
  );
}
