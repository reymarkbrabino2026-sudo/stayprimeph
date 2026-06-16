"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const wishlistStorageKey = "stayprimeph-wishlist-property-ids";
const pendingWishlistStorageKey = "stayprimeph-pending-wishlist-property-ids";
const wishlistChangedEvent = "stayprimeph:wishlist-changed";

function readWishlistIds() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(wishlistStorageKey) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeWishlistIds(ids: Set<string>) {
  window.localStorage.setItem(wishlistStorageKey, JSON.stringify([...ids]));
  window.dispatchEvent(new Event(wishlistChangedEvent));
}

function readStoredIds(key: string) {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

export function writePendingWishlistId(propertyId: string) {
  const ids = readStoredIds(pendingWishlistStorageKey);
  ids.add(propertyId);
  window.localStorage.setItem(pendingWishlistStorageKey, JSON.stringify([...ids]));
}

export function getWishlistIds() {
  return readWishlistIds();
}

export function setWishlistSaved(propertyId: string, saved: boolean) {
  const ids = readWishlistIds();
  if (saved) ids.add(propertyId);
  else ids.delete(propertyId);
  writeWishlistIds(ids);
}

export function subscribeToWishlistChanges(callback: () => void) {
  window.addEventListener(wishlistChangedEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(wishlistChangedEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function PendingWishlistSync() {
  useEffect(() => {
    const pendingIds = readStoredIds(pendingWishlistStorageKey);
    if (pendingIds.size === 0) return;

    const ids = readWishlistIds();
    pendingIds.forEach((id) => ids.add(id));
    writeWishlistIds(ids);
    window.localStorage.removeItem(pendingWishlistStorageKey);
  }, []);

  return null;
}

export function WishlistButton({
  propertyId,
  isAuthenticated,
  className,
}: {
  propertyId: string;
  isAuthenticated: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function syncSavedState() {
      setSaved(readWishlistIds().has(propertyId));
    }

    syncSavedState();
    return subscribeToWishlistChanges(syncSavedState);
  }, [propertyId]);

  function toggleWishlist(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      writePendingWishlistId(propertyId);
      window.location.assign(`/login?role=guest&next=${encodeURIComponent("/guest/wishlist")}`);
      return;
    }

    setWishlistSaved(propertyId, !saved);
  }

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
      onClick={toggleWishlist}
      className={className ?? "absolute right-3 top-3 grid size-8 place-items-center text-white drop-shadow"}
    >
      <Heart size={24} fill={saved ? "#ff385c" : "rgba(0,0,0,0.35)"} className={saved ? "text-[#ff385c]" : "text-white"} />
    </button>
  );
}
