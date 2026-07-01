import Link from "next/link";
import { Bath, BedDouble, Star, Trophy } from "lucide-react";
import { CardImageCarousel } from "@/components/search/card-image-carousel";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { calculateGuestPriceWithMarkup, calculateNightlySubtotal, formatGuestNightlyPriceRange, nightsBetweenDateKeys } from "@/lib/pricing";
import { getPropertyTypeLabel } from "@/lib/property-types";
import { formatPropertyLocation } from "@/lib/property-location";
import type { ListingDiscounts, PublicListingSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type DisplayDiscount = {
  label: string;
  percent: number;
  amount: number;
};

function pluralize(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function ratingLabel(rating: number) {
  if (!rating) return "New";
  return Number.isInteger(rating) ? rating.toFixed(1) : rating.toFixed(2).replace(/0$/, "");
}

function listingLabel(property: PublicListingSummary) {
  const type = getPropertyTypeLabel(property.propertyType, "Home");
  const location = property.city || formatPropertyLocation(property);
  return location ? `${type} in ${location}` : type;
}

function daysUntil(checkIn: string) {
  return Math.ceil((new Date(`${checkIn}T00:00:00`).getTime() - Date.now()) / 86400000);
}

function bestDisplayDiscount({
  discounts,
  nights,
  subtotal,
  checkIn,
}: {
  discounts?: ListingDiscounts;
  nights: number;
  subtotal: number;
  checkIn?: string;
}): DisplayDiscount | null {
  if (!discounts || nights <= 0 || subtotal <= 0) return null;

  const candidates: Array<Omit<DisplayDiscount, "amount">> = [];
  if (discounts.lastMinute && checkIn && daysUntil(checkIn) <= 14) candidates.push({ label: "Last-minute discount", percent: 3 });
  if (discounts.weekly && nights >= 7) candidates.push({ label: "Weekly discount", percent: 10 });
  if (discounts.monthly && nights >= 28) candidates.push({ label: "Monthly discount", percent: 20 });

  return candidates
    .map((discount) => ({ ...discount, amount: Math.round(subtotal * (discount.percent / 100)) }))
    .filter((discount) => discount.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0] ?? null;
}

function priceSummary(property: PublicListingSummary, checkIn?: string, checkOut?: string) {
  const nights = checkIn && checkOut ? nightsBetweenDateKeys(checkIn, checkOut) : 0;
  const hasStayDates = nights > 0;
  if (!hasStayDates) {
    return {
      discount: null,
      price: 0,
      priceLabel: formatGuestNightlyPriceRange(property).replace(" / ", " "),
      originalPrice: null,
      suffix: "",
    };
  }

  const staySubtotal = hasStayDates ? calculateNightlySubtotal(property, checkIn!, checkOut!) : null;
  const subtotal = staySubtotal && staySubtotal.subtotal > 0 ? staySubtotal.subtotal : property.pricePerNight;
  const discount = hasStayDates ? bestDisplayDiscount({ discounts: property.discounts, nights, subtotal, checkIn }) : null;
  const discountedSubtotal = Math.max(0, subtotal - (discount?.amount ?? 0));

  return {
    discount,
    price: calculateGuestPriceWithMarkup(discountedSubtotal),
    priceLabel: "",
    originalPrice: discount ? calculateGuestPriceWithMarkup(subtotal) : null,
    suffix: hasStayDates ? `for ${pluralize(nights, "night")}` : "night",
  };
}

export function SearchResultCard({
  property,
  isAuthenticated,
  priority = false,
  checkIn,
  checkOut,
}: {
  property: PublicListingSummary;
  isAuthenticated: boolean;
  priority?: boolean;
  checkIn?: string;
  checkOut?: string;
}) {
  const imageCount = property.images.length;
  const displayPrice = priceSummary(property, checkIn, checkOut);
  const favorite = property.rating >= 4.8;
  const bedroomLabel = pluralize(property.bedrooms, "bedroom");
  const bathroomLabel = pluralize(property.bathrooms, "bath");

  return (
    <Link
      href={`/rooms/${property.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block transition active:scale-[0.985]"
      aria-label={`Open ${property.title}`}
    >
      <div className={`relative aspect-[1.34/1] overflow-hidden rounded-[1.25rem] bg-gradient-to-br ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"}`}>
        <CardImageCarousel images={property.images} alt={property.title} priority={priority} />
        <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {favorite ? <Trophy size={13} className="text-[#a36b00]" /> : null}
          {favorite ? "Guest favorite" : "New"}
        </span>
        <WishlistButton propertyId={property.id} isAuthenticated={isAuthenticated} />
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-[15px] font-semibold leading-5 text-[#1f1b16]">{listingLabel(property)}</h3>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#1f1b16]">
            <Star size={14} fill="currentColor" />
            {ratingLabel(property.rating)}
          </span>
        </div>
        <p className="truncate text-sm leading-5 text-black/55">{property.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-black/55">
          <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {bedroomLabel}</span>
          <span className="inline-flex items-center gap-1"><Bath size={14} /> {bathroomLabel}</span>
          {imageCount > 1 ? <span>{imageCount} photos</span> : null}
        </p>
        <p className="pt-0.5 text-sm text-black/70">
          {displayPrice.originalPrice ? (
            <span className="mr-1.5 text-black/45 line-through">{formatCurrency(displayPrice.originalPrice)}</span>
          ) : null}
          {displayPrice.priceLabel ? (
            <span className="font-semibold text-[#1f1b16]">{displayPrice.priceLabel}</span>
          ) : (
            <>
              <span className="font-semibold text-[#1f1b16]">{formatCurrency(displayPrice.price)}</span>{" "}
              <span>{displayPrice.suffix}</span>
            </>
          )}
        </p>
        {displayPrice.discount ? (
          <span className="inline-flex rounded-full bg-[#dff5e6] px-2 py-0.5 text-xs font-semibold text-[#08743e]">
            {displayPrice.discount.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
