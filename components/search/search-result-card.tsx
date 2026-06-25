import Link from "next/link";
import { BedDouble, Camera, MapPin, Star, Users } from "lucide-react";
import { CardImageCarousel } from "@/components/search/card-image-carousel";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import { formatPropertyLocation } from "@/lib/property-location";
import type { PublicListingSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function SearchResultCard({
  property,
  isAuthenticated,
  priority = false,
}: {
  property: PublicListingSummary;
  isAuthenticated: boolean;
  priority?: boolean;
}) {
  const guestPrice = calculateGuestPriceWithMarkup(property.pricePerNight);
  const imageCount = property.images.length;
  const ratingLabel = property.rating ? property.rating.toFixed(1) : "New";
  const propertyType = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : "Stay";

  return (
    <Link
      href={`/rooms/${property.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[1.5rem] transition active:scale-[0.985]"
      aria-label={`Open ${property.title}`}
    >
      <div className={`relative aspect-[1.08/1] overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"}`}>
        <CardImageCarousel images={property.images} alt={property.title} priority={priority} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/45 to-transparent opacity-80 transition group-hover:opacity-100" />
        <span className="absolute left-3 top-3 z-20 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {property.rating >= 4.8 ? "Guest favorite" : "New"}
        </span>
        {imageCount > 1 ? (
          <span className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Camera size={13} />
            {imageCount}
          </span>
        ) : null}
        <WishlistButton propertyId={property.id} isAuthenticated={isAuthenticated} />
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-[#1f1b16]">{property.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-black/55">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{formatPropertyLocation(property)}</span>
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 text-sm font-semibold">
            <Star size={14} fill="currentColor" />
            {ratingLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/55">
          <span>{propertyType}</span>
          <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}</span>
          <span className="inline-flex items-center gap-1"><Users size={14} /> {property.maxGuests} guest{property.maxGuests === 1 ? "" : "s"}</span>
        </div>
        <p className="text-sm text-black/70">
          <span className="text-base font-semibold text-[#1f1b16]">{formatCurrency(guestPrice)}</span> night
        </p>
      </div>
    </Link>
  );
}
