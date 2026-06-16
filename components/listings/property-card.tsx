import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import type { Property } from "@/lib/types";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export function PropertyCard({ property }: { property: Property }) {
  const image = property.images[0]?.imageUrl;
  const guestPrice = calculateGuestPriceWithMarkup(property.pricePerNight);

  return (
    <Link href={`/properties/${property.id}`} className="group block">
      <div className={`relative mb-4 aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"} transition group-hover:-translate-y-1`}>
        {isRenderableImage(image) ? <Image src={image!} alt={property.title} fill sizes="(min-width:1024px) 32vw, 100vw" className="object-cover" /> : null}
        <div className="absolute inset-x-3 bottom-3 flex justify-end">
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow-sm">
            <Star size={13} fill="currentColor" /> {property.rating || "New"}
          </span>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{property.title}</h3>
          <p className="text-sm text-black/55">
            {formatPropertyLocation(property)}
          </p>
        </div>
        <p className="text-sm">
          <span className="font-semibold">{formatCurrency(guestPrice)}</span>/night
        </p>
      </div>
    </Link>
  );
}
