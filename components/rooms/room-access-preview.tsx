"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PropertyImage, PropertyRoom } from "@/lib/types";

function isRenderableImage(src?: string) {
  return Boolean(src && src !== "pending-upload" && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

function firstRenderableImage(images: Array<string | undefined>) {
  return images.find((image) => isRenderableImage(image));
}

function renderableImages(images: Array<string | undefined>) {
  return images.filter((image): image is string => isRenderableImage(image));
}

function backgroundImageStyle(src?: string) {
  return src ? { backgroundImage: `url(${JSON.stringify(src)})` } : undefined;
}

function listingFallbackImage(index: number, listingImages: PropertyImage[]) {
  const listingFallbacks = listingImages.map((image) => image.imageUrl);
  return firstRenderableImage([
    listingFallbacks[index % Math.max(listingFallbacks.length, 1)],
    ...listingFallbacks,
  ]);
}

export function RoomAccessPreview({
  rooms,
  listingImages,
}: {
  rooms: PropertyRoom[];
  listingImages: PropertyImage[];
  stayBookingAllowed: boolean;
}) {
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id);
  const [activeSlide, setActiveSlide] = useState(0);

  const roomPhotoImages = useMemo(
    () => new Map(rooms.map((room) => [room.id, renderableImages(room.photos)])),
    [rooms],
  );
  const roomFallbackImages = useMemo(
    () => new Map(rooms.map((room, index) => [room.id, listingFallbackImage(index, listingImages)])),
    [listingImages, rooms],
  );
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const fallbackImage = firstRenderableImage(listingImages.map((image) => image.imageUrl));
  const activeRoomImages = activeRoom ? roomPhotoImages.get(activeRoom.id) ?? [] : [];
  const activeFallbackImage = activeRoom ? roomFallbackImages.get(activeRoom.id) : undefined;
  const activeImage = activeRoomImages.length ? activeRoomImages[activeSlide % activeRoomImages.length] : activeFallbackImage ?? fallbackImage;
  const currentSlide = activeRoomImages.length ? activeSlide % activeRoomImages.length : 0;
  const hasRoomCarousel = activeRoomImages.length > 1;
  const hasRoomImageCount = activeRoomImages.length > 0;

  function selectRoom(roomId: string) {
    setActiveRoomId(roomId);
    setActiveSlide(0);
  }

  function showPreviousImage() {
    setActiveSlide((index) => (activeRoomImages.length ? (index - 1 + activeRoomImages.length) % activeRoomImages.length : 0));
  }

  function showNextImage() {
    setActiveSlide((index) => (activeRoomImages.length ? (index + 1) % activeRoomImages.length : 0));
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
      <div className="rounded-[1.35rem] border border-black/10 bg-[#fbfaf7] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Rooms</h3>
          {rooms.length ? <span className="rounded-full bg-[#083f35]/10 px-3 py-1 text-sm font-semibold text-[#083f35]">{rooms.length} spaces</span> : null}
        </div>
        <div className="mt-4 grid gap-1.5">
          {rooms.length ? rooms.map((room) => {
            const active = activeRoom?.id === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => selectRoom(room.id)}
                aria-pressed={active}
                className={`grid min-h-[3.7rem] grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-white p-2.5 text-left ring-1 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35] ${
                  active
                    ? "shadow-[0_14px_30px_rgb(8_63_53_/_0.10)] ring-[#083f35]/35"
                    : "ring-black/10 hover:-translate-y-0.5 hover:ring-[#083f35]/25"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="line-clamp-1 font-semibold">{room.name}</span>
                    <span className="text-sm text-black/55">{room.floor}</span>
                  </span>
                  <span className="mt-1 line-clamp-1 block text-sm leading-5 text-black/62">
                    {[room.description, room.amenities.length ? room.amenities.join(", ") : "Access details set by host"].filter(Boolean).join(" - ")}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#083f35]/10 px-2 py-0.5 text-xs font-semibold text-[#083f35]">{room.capacity} pax</span>
              </button>
            );
          }) : (
            <p className="rounded-2xl bg-white p-4 text-sm text-black/60 ring-1 ring-black/10">Room details are managed by the host.</p>
          )}
        </div>
      </div>

      <div className="relative min-h-[25rem] overflow-hidden rounded-[1.35rem] border border-black/10 bg-[#11382f] text-white shadow-[0_14px_44px_rgb(0_0_0_/_0.08)] lg:h-full">
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

        {hasRoomImageCount ? (
          <span className="absolute bottom-4 right-4 z-10 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_20px_rgb(0_0_0_/_0.20)]">
            {currentSlide + 1} / {activeRoomImages.length}
          </span>
        ) : null}

        {hasRoomCarousel ? (
          <>
            <button
              type="button"
              aria-label="Previous room image"
              onClick={showPreviousImage}
              className="absolute left-4 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#083f35] shadow-[0_10px_24px_rgb(0_0_0_/_0.16)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next room image"
              onClick={showNextImage}
              className="absolute right-4 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#083f35] shadow-[0_10px_24px_rgb(0_0_0_/_0.16)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {activeRoomImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`Show room image ${index + 1}`}
                  onClick={() => setActiveSlide(index)}
                  className={`size-2.5 rounded-full ring-1 ring-white/70 transition ${
                    index === currentSlide ? "bg-white" : "bg-white/45 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
