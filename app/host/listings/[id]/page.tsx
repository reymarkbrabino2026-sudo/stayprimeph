import { notFound } from "next/navigation";
import { Bath, BedDouble, DoorOpen, Home, MapPin, PackageCheck, Palmtree, Users, WalletCards, type LucideIcon } from "lucide-react";
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
import { getPropertyTypeIconName, getPropertyTypeLabel } from "@/lib/property-types";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> }) {
  const [{ id }, query, user, csrfToken] = await Promise.all([params, searchParams, getCurrentUser(), getCsrfToken()]);
  const property = await getPropertyById(id);
  if (!property || property.hostId !== user?.id) notFound();

  const cover = property.images[0]?.imageUrl;
  const wholePlaceAccessEnabled = isEntirePlaceListing(property);
  const visibleRooms = wholePlaceAccessEnabled ? property.rooms?.filter((room) => room.active) ?? [] : [];
  const packageOnlyListing = property.bookingType === "package";
  const editFormId = `listing-edit-${property.id}`;
  const propertyTypeLabel = getPropertyTypeLabel(property.propertyType);
  const PropertyTypeIcon = getPropertyTypeIconName(property.propertyType) === "palmtree" ? Palmtree : Home;

  return (
    <DashboardShell title="Listing Details" subtitle="Host dashboard" description="Review the listing guests and admins will see." links={hostLinks}>
      <div className="grid gap-6 xl:grid-cols-[minmax(320px,430px)_minmax(0,1fr)] xl:items-start">
        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
          <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_18px_55px_rgba(53,31,8,0.08)]">
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100">
              <ResilientImage src={cover} alt={property.title} sizes="(min-width: 1280px) 430px, 100vw" priority />
              <span className="absolute left-4 top-4"><StatusBadge status={property.status} /></span>
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-bold leading-tight text-[#21170f]">{property.title}</h2>
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-black/65">
                <MapPin size={17} className="mt-0.5 shrink-0 text-[#083f35]" aria-hidden="true" />
                <span>{property.address}, {formatPropertyLocation(property)}</span>
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {packageOnlyListing ? null : <Info icon={WalletCards} label="Nightly price" value={formatCurrency(property.pricePerNight)} />}
                <Info icon={Users} label="Guests" value={String(property.maxGuests)} />
                <Info icon={BedDouble} label="Bedrooms" value={String(property.bedrooms)} />
                <Info icon={Bath} label="Bathrooms" value={String(property.bathrooms)} />
                <Info icon={PropertyTypeIcon} label="Property type" value={propertyTypeLabel} />
              </div>
              <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-[#fbf7f2] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">Description</p>
                <p className="mt-2 leading-7 text-black/70">{property.description}</p>
              </div>
            </div>
          </section>

          {(visibleRooms.length || wholePlaceAccessEnabled) ? (
            <section className="space-y-5 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[0_18px_55px_rgba(53,31,8,0.08)]">
              {visibleRooms.length ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f1eadf] text-[#083f35]">
                      <DoorOpen size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-bold text-[#21170f]">Rooms</h3>
                      <p className="mt-1 text-sm text-black/55">{visibleRooms.length} room{visibleRooms.length === 1 ? "" : "s"} available</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {visibleRooms.map((room) => (
                      <RoomPaxInput key={room.id} formId={editFormId} room={room} />
                    ))}
                  </div>
                </div>
              ) : null}
              {wholePlaceAccessEnabled ? (
                <div className={visibleRooms.length ? "border-t border-black/10 pt-5" : undefined}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f1eadf] text-[#083f35]">
                      <PackageCheck size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-bold text-[#21170f]">Booking packages</h3>
                      <p className="mt-1 text-sm text-black/55">Package access and included amenities</p>
                    </div>
                  </div>
                  <BookingPackageEditor property={property} formId={editFormId} hideTitle compactByDefault />
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>

        <section className="min-w-0">
          <ListingForm mode="Edit" property={property} csrfToken={csrfToken} formId={editFormId} initialSaved={query.updated === "1"} />
        </section>
      </div>

      <div className="mb-[calc(13rem+env(safe-area-inset-bottom))] mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center sm:justify-between lg:mb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div>
          <p className="font-semibold text-red-800">Delete this listing</p>
          <p className="mt-1 text-sm text-red-700/80">Permanently remove this listing. Listings with active bookings can&apos;t be deleted.</p>
        </div>
        <DeleteListingButton listingId={property.id} csrfToken={csrfToken} />
      </div>
    </DashboardShell>
  );
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#fbf7f2] p-4">
      <Icon size={18} className="text-[#083f35]" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#21170f]">{value}</p>
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
    <div className="rounded-2xl border border-black/10 bg-[#fbf7f2] p-4">
      <p className="text-sm font-semibold text-[#21170f]">{room.name}</p>
      <p className="mt-1 text-xs text-black/50">{room.floor}</p>
      <label className="mt-3 flex max-w-36 items-center gap-2">
        <input
          form={formId}
          name={`roomCapacity:${room.id}`}
          type="number"
          min={1}
          max={100}
          defaultValue={room.capacity}
          required
          aria-label={`${room.name} pax`}
          className="min-h-11 w-20 rounded-xl border border-black/10 bg-white px-3 text-base font-bold outline-none transition focus:border-[#083f35] focus:ring-4 focus:ring-[#083f35]/10"
        />
        <span className="font-semibold text-black/70">pax</span>
      </label>
    </div>
  );
}
