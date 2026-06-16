import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import { formatPropertyLocation } from "@/lib/property-location";
import type { Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export function SearchResultCard({
  property,
  isAuthenticated,
  priority = false,
}: {
  property: Property;
  isAuthenticated: boolean;
  priority?: boolean;
}) {
  const image = property.images[0]?.imageUrl;
  const guestPrice = calculateGuestPriceWithMarkup(property.pricePerNight);

  return (
    <Link href={`/rooms/${property.id}`} className="group block transition active:scale-[0.985]">
      <div className={`relative aspect-[1.05/1] overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"}`}>
        {isRenderableImage(image) ? (
          <Image
            src={image!}
            alt={property.title}
            fill
            sizes="(min-width:1280px) 24vw, (min-width:768px) 48vw, 100vw"
            className="object-cover transition duration-300 md:group-hover:scale-[1.02]"
            preload={priority}
            loading={priority ? "eager" : undefined}
          />
        ) : null}
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">
          {property.rating >= 4.8 ? "Guest favorite" : "New"}
        </span>
        <WishlistButton propertyId={property.id} isAuthenticated={isAuthenticated} />
      </div>
      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold">{formatPropertyLocation(property)}</h3>
          <span className="flex items-center gap-1 text-sm"><Star size={14} fill="currentColor" /> {property.rating || "New"}</span>
        </div>
        <p className="text-sm text-black/55">{property.propertyType} / {property.bedrooms} beds</p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">{formatCurrency(guestPrice)}</span> night
        </p>
      </div>
    </Link>
  );
}
