"use client";

import { useMemo, useState } from "react";
import type { PropertyImage, PropertyRoom } from "@/lib/types";

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
  listingImages,
  stayBookingAllowed,
}: {
  rooms: PropertyRoom[];
  listingImages: PropertyImage[];
  stayBookingAllowed: boolean;
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
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
      <div className="rounded-[1.35rem] border border-black/10 bg-[#fbfaf7] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Rooms</h3>
          {rooms.length ? <span className="rounded-full bg-[#083f35]/10 px-3 py-1 text-sm font-semibold text-[#083f35]">{rooms.length} spaces</span> : null}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                className={`flex min-h-[9.35rem] flex-col justify-between rounded-2xl bg-white p-4 text-left ring-1 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35] ${
                  active
                    ? "shadow-[0_14px_30px_rgb(8_63_53_/_0.10)] ring-[#083f35]/35"
                    : "ring-black/10 hover:-translate-y-0.5 hover:ring-[#083f35]/25"
                }`}
              >
                <span>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="line-clamp-1 block font-semibold">{room.name}</span>
                      <span className="mt-0.5 block text-sm text-black/55">{room.floor}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#083f35]/10 px-2.5 py-1 text-xs font-semibold text-[#083f35]">{room.capacity} pax</span>
                  </span>
                  {room.description ? <span className="mt-2 line-clamp-2 block text-sm leading-5 text-black/62">{room.description}</span> : null}
                </span>
                {room.amenities.length ? (
                  <span className="mt-2 line-clamp-1 block text-xs text-black/45">{room.amenities.join(", ")}</span>
                ) : (
                  <span className="mt-2 block text-xs text-black/35">Access details set by host</span>
                )}
              </button>
            );
          }) : (
            <p className="rounded-2xl bg-white p-4 text-sm text-black/60 ring-1 ring-black/10">Room details are managed by the host.</p>
          )}
        </div>
      </div>

      <div className="relative min-h-[28rem] overflow-hidden rounded-[1.35rem] border border-black/10 bg-[#11382f] p-5 text-white shadow-[0_14px_44px_rgb(0_0_0_/_0.08)] sm:p-6 lg:h-full">
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

        <div className="relative z-10 flex min-h-[calc(28rem-2.5rem)] flex-col gap-5 lg:h-full lg:min-h-0">
          <article className="max-w-md">
            <h3 className="text-xl font-semibold">{stayBookingAllowed ? "Stay booking" : "Room preview"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/78">
              {stayBookingAllowed
                ? "This listing is available for traditional accommodation booking. Use the reservation card to choose dates and guests."
                : "Hover a room to preview its uploaded photo and access details before you reserve."}
            </p>
          </article>

          {activeRoom ? (
            <div className="max-w-xl border-t border-white/25 pt-5">
              <p className="text-sm font-semibold text-white/70">{activeRoom.floor}</p>
              <p className="mt-1 text-2xl font-semibold">{activeRoom.name}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">{activeRoom.description || `${activeRoom.capacity} pax capacity`}</p>
              {activeRoom.amenities.length ? <p className="mt-2 text-xs font-medium text-white/55">{activeRoom.amenities.join(", ")}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
