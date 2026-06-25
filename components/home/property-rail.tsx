"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import type { PublicListingSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

function toTitleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function listingLabel(property: PublicListingSummary) {
  const type = toTitleCase(property.propertyType || "Home");
  const location = property.city || property.country;
  return location ? `${type} in ${location}` : property.title;
}

function ratingLabel(rating: number) {
  if (!rating) return "New";
  return Number.isInteger(rating) ? `${rating}.0` : rating.toFixed(2).replace(/0$/, "");
}

function railHref(title: string) {
  const location = title.match(/\bin\s+(.+)$/i)?.[1];
  return location ? `/search?location=${encodeURIComponent(`${location}, Philippines`)}` : "/search";
}

export function PropertyRail({ title, items, isAuthenticated }: { title: string; items: PublicListingSummary[]; isAuthenticated: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollPrevious(rail.scrollLeft > 4);
    setCanScrollNext(rail.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items.length, updateScrollState]);

  function slide(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.round(rail.clientWidth * 0.88),
      behavior: "smooth",
    });

    window.setTimeout(updateScrollState, 350);
  }

  const viewAllHref = railHref(title);

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-[1.2rem] font-semibold leading-6 tracking-normal text-black md:text-xl">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={viewAllHref}
            aria-label={`View all ${title}`}
            className="grid size-8 place-items-center rounded-full bg-black/[0.06] text-black transition active:scale-95 md:hidden"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </Link>
          <button
            type="button"
            onClick={() => slide(-1)}
            disabled={!canScrollPrevious}
            className="hidden size-8 place-items-center rounded-full bg-black/[0.05] text-black transition hover:bg-black/[0.09] disabled:pointer-events-none disabled:text-black/15 disabled:opacity-45 md:grid"
            aria-label={`Show previous ${title}`}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => slide(1)}
            disabled={!canScrollNext}
            className="hidden size-8 place-items-center rounded-full bg-black/[0.07] text-black transition hover:bg-black/[0.11] disabled:pointer-events-none disabled:text-black/15 disabled:opacity-45 md:grid"
            aria-label={`Show next ${title}`}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div ref={railRef} className="no-scrollbar touch-scroll -mr-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pr-6 pb-2 pt-1 md:mx-0 md:gap-4 md:px-0 md:pb-3 md:pt-2">
        {items.map((property) => {
          const image = property.images[0]?.imageUrl;
          const guestPrice = calculateGuestPriceWithMarkup(property.pricePerNight);
          const twoNightPrice = guestPrice * 2;
          return (
            <article key={property.id} className="relative min-w-0 shrink-0 basis-[calc((100vw_-_3.75rem)/2)] snap-start sm:basis-[calc((100%_-_2rem)/3)] md:basis-[calc((100%_-_3rem)/4)] xl:basis-[calc((100%_-_5rem)/6)] 2xl:basis-[calc((100%_-_6rem)/7)]">
              <Link href={`/rooms/${property.id}`} target="_blank" rel="noopener noreferrer" className="group block transition active:scale-[0.985]">
                <div className={`relative aspect-square overflow-hidden rounded-[1.15rem] bg-gradient-to-br transition duration-300 md:rounded-[1.25rem] md:group-hover:-translate-y-1 ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"}`}>
                  {isRenderableImage(image) ? <Image src={image!} alt={property.title} fill sizes="(min-width:1536px) 14vw, (min-width:1280px) 16vw, (min-width:768px) 24vw, 46vw" className="object-cover" draggable={false} /> : null}
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold leading-4 text-black shadow-sm md:left-3 md:top-3 md:text-xs">{property.rating >= 4.8 ? "Guest favorite" : "New"}</span>
                </div>
                <h3 className="mt-2 truncate text-sm font-semibold leading-5 text-black">{listingLabel(property)}</h3>
                <p className="truncate text-sm leading-5 text-black/55">
                  {formatCurrency(twoNightPrice)} for 2 nights · <Star className="inline-block align-[-1px]" size={12} fill="currentColor" /> {ratingLabel(property.rating)}
                </p>
              </Link>
              <WishlistButton propertyId={property.id} isAuthenticated={isAuthenticated} className="absolute right-2.5 top-2.5 grid size-8 place-items-center text-white drop-shadow md:right-3 md:top-3" />
            </article>
          );
        })}
      </div>
    </section>
  );
}
