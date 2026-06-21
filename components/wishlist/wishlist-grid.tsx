"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { getWishlistIds, subscribeToWishlistChanges } from "@/components/wishlist/wishlist-button";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import type { Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export function WishlistGrid({ properties }: { properties: Property[] }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    function syncWishlist() {
      setSavedIds(getWishlistIds());
    }

    syncWishlist();
    return subscribeToWishlistChanges(syncWishlist);
  }, []);

  const saved = useMemo(() => properties.filter((property) => savedIds.has(property.id)), [properties, savedIds]);

  if (saved.length === 0) {
    return <EmptyState title="No saved homes yet" body="Tap the heart on a listing to save it to your wishlist." />;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {saved.map((property) => {
        const cover = property.images[0]?.imageUrl;
        const guestPrice = calculateGuestPriceWithMarkup(property.pricePerNight);
        return (
          <Link key={property.id} href={`/rooms/${property.id}`} target="_blank" rel="noopener noreferrer" className="block rounded-[1.75rem] bg-white p-4 soft-card transition hover:-translate-y-1">
            <div className={`relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-gradient-to-br ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"}`}>
              {isRenderableImage(cover) ? <Image src={cover!} alt={property.title} fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" className="object-cover" /> : null}
            </div>
            <h2 className="mt-4 font-semibold">{property.title}</h2>
            <p className="mt-1 text-sm text-black/55">{property.city}, {property.country}</p>
            <p className="mt-3 text-sm font-semibold">{formatCurrency(guestPrice)} / night</p>
          </Link>
        );
      })}
    </div>
  );
}
