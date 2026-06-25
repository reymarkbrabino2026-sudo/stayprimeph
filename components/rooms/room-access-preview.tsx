"use client";

import { useMemo, useState } from "react";
import type { BookingPackage, PropertyImage, PropertyRoom } from "@/lib/types";

function isRenderableImage(src?: string) {
  return Boolean(src && src !== "pending-upload" && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

function firstRenderableImage(images: Array<string | undefined>) {
  return images.find((image) => isRenderableImage(image));
}

function backgroundImageStyle(src?: string) {
  return src ? { backgroundImage: `url(${JSON.stringify(src)})` } : undefined;
}

function roomImage(room: PropertyRoom, index: number, listingImages: PropertyImage[]) {
  const listingFallbacks = listingImages.map((image) => image.imageUrl);
  return firstRenderableImage([
    ...room.photos,
    listingFallbacks[index % Math.max(listingFallbacks.length, 1)],
    ...listingFallbacks,
  ]);
}

export function RoomAccessPreview({
  rooms,
  bookingPackages,
  listingImages,
  stayBookingAllowed,
  packageBookingAllowed,
}: {
  rooms: PropertyRoom[];
  bookingPackages: BookingPackage[];
  listingImages: PropertyImage[];
  stayBookingAllowed: boolean;
  packageBookingAllowed: boolean;
}) {
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id);

  const roomPreviewImages = useMemo(
    () => new Map(rooms.map((room, index) => [room.id, roomImage(room, index, listingImages)])),
    [listingImages, rooms],
  );
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const activeImage =
    (activeRoom ? roomPreviewImages.get(activeRoom.id) : undefined) ??
    firstRenderableImage([...rooms.flatMap((room) => room.photos), ...listingImages.map((image) => image.imageUrl)]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="rounded-[1.75rem] border border-black/10 bg-[#fbfaf7] p-6">
        <h3 className="text-xl font-semibold">Rooms</h3>
        <div className="mt-5 grid gap-3">
          {rooms.length ? rooms.map((room) => {
            const active = activeRoom?.id === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                onFocus={() => setActiveRoomId(room.id)}
                onMouseEnter={() => setActiveRoomId(room.id)}
                aria-pressed={active}
                className={`rounded-2xl bg-white p-4 text-left ring-1 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35] ${
                  active
                    ? "shadow-[0_14px_30px_rgb(8_63_53_/_0.10)] ring-[#083f35]/35"
                    : "ring-black/10 hover:-translate-y-0.5 hover:ring-[#083f35]/25"
                }`}
              >
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block font-semibold">{room.name}</span>
                    <span className="mt-1 block text-sm text-black/55">{room.floor}</span>
                  </span>
                  <span className="rounded-full bg-[#083f35]/10 px-3 py-1 text-sm font-semibold text-[#083f35]">{room.capacity} pax</span>
                </span>
                {room.description ? <span className="mt-3 block text-sm leading-6 text-black/62">{room.description}</span> : null}
                {room.amenities.length ? <span className="mt-2 block text-xs text-black/45">{room.amenities.join(", ")}</span> : null}
              </button>
            );
          }) : (
            <p className="rounded-2xl bg-white p-4 text-sm text-black/60 ring-1 ring-black/10">Room details are managed by the host.</p>
          )}
        </div>
      </div>

      <div className="relative min-h-[34rem] overflow-hidden rounded-[1.75rem] border border-black/10 bg-[#11382f] p-6 text-white shadow-[0_14px_44px_rgb(0_0_0_/_0.08)]">
        {activeImage ? (
          <div
            key={activeImage}
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={backgroundImageStyle(activeImage)}
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-[#d8d5cc]" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/30 to-black/45" />

        <div className="relative z-10 flex min-h-[calc(34rem-3rem)] flex-col gap-5">
          {packageBookingAllowed ? (
            <div className="grid content-start gap-4">
              {bookingPackages.map((pkg) => {
                const packageRooms = rooms.filter((room) => pkg.accessibleRoomIds?.includes(room.id));
                return (
                  <article key={pkg.id} className="rounded-[1.5rem] border border-white/30 bg-white/90 p-5 text-black shadow-[0_14px_34px_rgb(0_0_0_/_0.14)] backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">{pkg.name}</h3>
                        <p className="mt-1 text-sm text-black/58">{pkg.description || pkg.accessType}</p>
                      </div>
                      <span className="rounded-full bg-[#f6f1e9] px-3 py-1.5 text-sm font-semibold text-[#083f35]">
                        {pkg.unit === "day" ? "Day package" : "Overnight"}
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                      <InfoPill label="Capacity" value={`${pkg.maxGuests} guests`} />
                      <InfoPill label="Sleeping" value={`${pkg.sleepingCapacity ?? 0} guests`} />
                      <InfoPill label="Duration" value={pkg.durationHours ? `${pkg.durationHours} hours` : `${pkg.checkInTime} to ${pkg.checkOutTime}`} />
                    </div>
                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <AccessBlock label="Floors" items={pkg.accessibleFloors ?? []} fallback={pkg.accessType} />
                      <AccessBlock label="Rooms" items={packageRooms.map((room) => room.name)} fallback="No bedroom access" />
                      <AccessBlock label="Included amenities" items={pkg.includedAmenities ?? []} fallback="Property amenities apply" />
                      <AccessBlock label="Excluded" items={pkg.excludedAmenities ?? []} fallback="None listed" />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : stayBookingAllowed ? (
            <article className="max-w-md">
              <h3 className="text-xl font-semibold">Stay booking</h3>
              <p className="mt-2 text-sm leading-6 text-white/78">
                This listing is available for traditional accommodation booking. Use the reservation card to choose dates and guests.
              </p>
            </article>
          ) : null}

          {activeRoom ? (
            <div className="max-w-xl border-t border-white/25 pt-5">
              <p className="text-sm font-semibold text-white/70">{activeRoom.floor}</p>
              <p className="mt-1 text-2xl font-semibold">{activeRoom.name}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">{activeRoom.description || `${activeRoom.capacity} pax capacity`}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f6f1e9] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className="mt-1 font-semibold text-[#083f35]">{value}</p>
    </div>
  );
}

function AccessBlock({ label, items, fallback }: { label: string; items: string[]; fallback: string }) {
  const visibleItems = items.filter(Boolean);

  return (
    <div className="rounded-2xl border border-black/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">{label}</p>
      <p className="mt-2 leading-6 text-black/65">{visibleItems.length ? visibleItems.join(", ") : fallback}</p>
    </div>
  );
}
