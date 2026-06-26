"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { WheelEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { RoomGalleryCarousel } from "@/components/rooms/room-gallery-carousel";
import { RoomPhotoTour } from "@/components/rooms/room-photo-tour";
import {
  getWishlistIds,
  setWishlistSaved,
  subscribeToWishlistChanges,
  writePendingWishlistId,
} from "@/components/wishlist/wishlist-button";
import type { PhotoTourGroup } from "@/lib/room-photo-tour";

interface GalleryImage {
  id: string;
  imageUrl: string;
}

const PHOTO_TOUR_MODAL = "PHOTO_TOUR_SCROLLABLE";
const PHOTO_TOUR_MODAL_EVENT = "stayprimeph:photo-tour-modal";

type ScrollLockSnapshot = {
  scrollY: number;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  lenisWasStopped: boolean;
};

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
  window.dispatchEvent(new Event(PHOTO_TOUR_MODAL_EVENT));
}

function subscribePhotoTourParam(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(PHOTO_TOUR_MODAL_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(PHOTO_TOUR_MODAL_EVENT, onStoreChange);
  };
}

function getServerPhotoTourSnapshot() {
  return false;
}

function scrollDialogOnWheel(event: WheelEvent<HTMLDivElement>) {
  const dialog = event.currentTarget;
  if (dialog.scrollHeight <= dialog.clientHeight) return;

  event.stopPropagation();
  event.preventDefault();
  dialog.scrollTop += event.deltaY;
}

function lockDocumentScroll(): ScrollLockSnapshot {
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const lenisWasStopped = document.documentElement.classList.contains("lenis-stopped");
  const snapshot = {
    scrollY,
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyWidth: document.body.style.width,
    bodyPaddingRight: document.body.style.paddingRight,
    htmlOverflow: document.documentElement.style.overflow,
    htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
    lenisWasStopped,
  };

  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  document.documentElement.classList.add("lenis-stopped");
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

  return snapshot;
}

function unlockDocumentScroll(snapshot: ScrollLockSnapshot) {
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.position = snapshot.bodyPosition;
  document.body.style.top = snapshot.bodyTop;
  document.body.style.width = snapshot.bodyWidth;
  document.body.style.paddingRight = snapshot.bodyPaddingRight;
  document.documentElement.style.overflow = snapshot.htmlOverflow;
  document.documentElement.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;
  if (!snapshot.lenisWasStopped) document.documentElement.classList.remove("lenis-stopped");
  window.scrollTo(0, snapshot.scrollY);
}

export function RoomGalleryShowcase({
  images,
  title,
  groups,
  propertyId,
  isAuthenticated,
}: {
  images: GalleryImage[];
  title: string;
  groups: PhotoTourGroup[];
  propertyId: string;
  isAuthenticated: boolean;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollLockSnapshotRef = useRef<ScrollLockSnapshot | null>(null);
  const open = useSyncExternalStore(subscribePhotoTourParam, hasPhotoTourParam, getServerPhotoTourSnapshot);
  const canShowPhotoTour = groups.length > 0;
  const [saved, setSaved] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");

  useEffect(() => {
    function syncSavedState() {
      setSaved(getWishlistIds().has(propertyId));
    }

    syncSavedState();
    return subscribeToWishlistChanges(syncSavedState);
  }, [propertyId]);

  useEffect(() => {
    if (shareLabel === "Share") return;
    const timeout = window.setTimeout(() => setShareLabel("Share"), 1800);
    return () => window.clearTimeout(timeout);
  }, [shareLabel]);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    scrollLockSnapshotRef.current = lockDocumentScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePhotoTour();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (scrollLockSnapshotRef.current) unlockDocumentScroll(scrollLockSnapshotRef.current);
      scrollLockSnapshotRef.current = null;
    };
  }, [open]);

  function openPhotoTour() {
    if (!canShowPhotoTour) return;
    if (!hasPhotoTourParam()) updatePhotoTourParam(true, "push");
  }

  function closePhotoTour() {
    if (hasPhotoTourParam()) updatePhotoTourParam(false, "replace");
  }

  async function shareStay() {
    const url = new URL(window.location.href);
    url.searchParams.delete("modal");
    url.searchParams.delete("v");

    try {
      if (navigator.share) {
        await navigator.share({ title, url: url.toString() });
        return;
      }

      await navigator.clipboard.writeText(url.toString());
      setShareLabel("Link copied");
    } catch {
      setShareLabel("Unable to share");
    }
  }

  function toggleSave() {
    if (!isAuthenticated) {
      writePendingWishlistId(propertyId);
      window.location.assign(`/login?role=guest&next=${encodeURIComponent("/guest/wishlist")}`);
      return;
    }

    setWishlistSaved(propertyId, !saved);
  }

  const photoTourDialog = open ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onWheel={scrollDialogOnWheel}
      data-lenis-prevent
      className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain bg-white text-[#111111]"
    >
      <div className="sticky top-0 z-40 border-b border-black/10 bg-white">
        <div className="grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 px-5 py-3 sm:min-h-20 sm:gap-4 sm:px-8">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closePhotoTour}
            aria-label="Back to listing"
            className="grid size-10 shrink-0 place-items-center rounded-full text-[#111111] transition hover:bg-black/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
          >
            <ArrowLeft size={22} />
          </button>

          <h2 id={titleId} className="min-w-0 truncate text-center text-base font-semibold text-[#111111]">
            Photo tour
          </h2>

          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#111111] sm:gap-5">
            <button
              type="button"
              onClick={shareStay}
              aria-label={shareLabel}
              className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2 underline-offset-2 transition hover:bg-black/[0.06] sm:px-0 sm:hover:bg-transparent sm:hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">{shareLabel}</span>
            </button>
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={saved}
              aria-label={saved ? "Saved" : "Save"}
              className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2 underline-offset-2 transition hover:bg-black/[0.06] sm:px-0 sm:hover:bg-transparent sm:hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
            >
              <Heart size={18} fill={saved ? "#ff385c" : "none"} className={saved ? "text-[#ff385c]" : undefined} />
              <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[88rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <RoomPhotoTour groups={groups} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <RoomGalleryCarousel
        images={images}
        title={title}
        onShowAllPhotos={canShowPhotoTour ? openPhotoTour : undefined}
      />

      {photoTourDialog ? createPortal(photoTourDialog, document.body) : null}
    </>
  );
}
