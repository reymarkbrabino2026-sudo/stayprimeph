"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { RoomGalleryCarousel } from "@/components/rooms/room-gallery-carousel";
import { RoomPhotoTour } from "@/components/rooms/room-photo-tour";
import type { PhotoTourGroup } from "@/lib/room-photo-tour";

interface GalleryImage {
  id: string;
  imageUrl: string;
}

const PHOTO_TOUR_MODAL = "PHOTO_TOUR_SCROLLABLE";

function hasPhotoTourParam() {
  if (typeof window === "undefined") return false;
  return new URL(window.location.href).searchParams.get("modal") === PHOTO_TOUR_MODAL;
}

function updatePhotoTourParam(open: boolean, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (open) url.searchParams.set("modal", PHOTO_TOUR_MODAL);
  else url.searchParams.delete("modal");

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") window.history.pushState({ photoTourOpen: open }, "", nextUrl);
  else window.history.replaceState({ photoTourOpen: open }, "", nextUrl);
}

export function RoomGalleryShowcase({
  images,
  title,
  groups,
}: {
  images: GalleryImage[];
  title: string;
  groups: PhotoTourGroup[];
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousOverflowRef = useRef<string | null>(null);
  const [open, setOpen] = useState(() => hasPhotoTourParam());
  const canShowPhotoTour = groups.length > 0;

  useEffect(() => {
    function handlePopState() {
      setOpen(hasPhotoTourParam());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePhotoTour();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousOverflowRef.current = null;
    };
  }, [open]);

  function openPhotoTour() {
    if (!canShowPhotoTour) return;
    setOpen(true);
    if (!hasPhotoTourParam()) updatePhotoTourParam(true, "push");
  }

  function closePhotoTour() {
    setOpen(false);
    if (hasPhotoTourParam()) updatePhotoTourParam(false, "replace");
  }

  return (
    <>
      <RoomGalleryCarousel
        images={images}
        title={title}
        onShowAllPhotos={canShowPhotoTour ? openPhotoTour : undefined}
      />

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[80] overflow-y-auto bg-white text-[#111111]"
        >
          <div className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
            <div className="mx-auto flex min-h-16 max-w-[88rem] items-center gap-4 px-5 py-3 sm:px-8 lg:px-12">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closePhotoTour}
                aria-label="Close photo tour"
                className="grid size-10 shrink-0 place-items-center rounded-full text-[#111111] transition hover:bg-black/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
              >
                <X size={22} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#0f5750]">Gallery</p>
                <h2 id={titleId} className="truncate text-lg font-semibold sm:text-xl">
                  Photo tour
                </h2>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[88rem] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
            <div className="border-b border-black/10 pb-7">
              <p className="text-sm font-semibold uppercase text-[#0f5750]">Gallery</p>
              <h3 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">Photo tour</h3>
              <p className="mt-4 max-w-2xl leading-7 text-black/62">
                Featured views, room spaces, and extra listing images from this stay.
              </p>
            </div>
            <RoomPhotoTour groups={groups} />
          </div>
        </div>
      ) : null}
    </>
  );
}
