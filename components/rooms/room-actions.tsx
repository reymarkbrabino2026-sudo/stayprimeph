"use client";

import { Heart, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getWishlistIds, setWishlistSaved, subscribeToWishlistChanges, writePendingWishlistId } from "@/components/wishlist/wishlist-button";

export function RoomActions({
  propertyId,
  propertyTitle,
  isAuthenticated,
}: {
  propertyId: string;
  propertyTitle: string;
  isAuthenticated: boolean;
}) {
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

  async function shareStay() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: propertyTitle, url });
        return;
      }

      await navigator.clipboard.writeText(url);
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
    setSaved(!saved);
  }

  return (
    <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
      <button
        type="button"
        onClick={shareStay}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 transition hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
      >
        <Share2 size={16} /> {shareLabel}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 transition hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
      >
        <Heart size={16} fill={saved ? "#ff385c" : "none"} className={saved ? "text-[#ff385c]" : undefined} />
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
