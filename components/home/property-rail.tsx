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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          {title}
          <span className="grid h-7 w-7 place-items-center rounded-full bg-black/5 text-base">›</span>
        </h2>
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => slide(-1)}
            disabled={!canScrollPrevious}
            className="grid size-8 place-items-center rounded-full bg-black/[0.05] text-black transition hover:bg-black/[0.09] disabled:pointer-events-none disabled:text-black/15 disabled:opacity-45"
            aria-label={`Show previous ${title}`}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => slide(1)}
            disabled={!canScrollNext}
            className="grid size-8 place-items-center rounded-full bg-black/[0.07] text-black transition hover:bg-black/[0.11] disabled:pointer-events-none disabled:text-black/15 disabled:opacity-45"
            aria-label={`Show next ${title}`}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div ref={railRef} className="no-scrollbar touch-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 pt-2">
        {items.map((property) => {
          const image = property.images[0]?.imageUrl;
          const guestPrice = calculateGuestPriceWithMarkup(property.pricePerNight);
          return (
            <article key={property.id} className="relative min-w-0 shrink-0 basis-[72vw] snap-start sm:basis-[calc((100%_-_1rem)/2)] md:basis-[calc((100%_-_3rem)/4)] xl:basis-[calc((100%_-_5rem)/6)] 2xl:basis-[calc((100%_-_6rem)/7)]">
              <Link href={`/rooms/${property.id}`} target="_blank" rel="noopener noreferrer" className="group block transition active:scale-[0.985]">
                <div className={`relative aspect-[1.08/1] overflow-hidden rounded-[1.25rem] bg-gradient-to-br transition duration-300 md:group-hover:-translate-y-1 ${property.images[0]?.tone ?? "from-rose-100 via-orange-50 to-stone-100"}`}>
                  {isRenderableImage(image) ? <Image src={image!} alt={property.title} fill sizes="(min-width:1536px) 14vw, (min-width:1280px) 16vw, (min-width:768px) 24vw, 72vw" className="object-cover" draggable={false} /> : null}
                  <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">{property.rating >= 4.8 ? "Guest favorite" : "New"}</span>
                </div>
                <h3 className="mt-2 truncate text-sm font-semibold">{property.title}</h3>
                <p className="truncate text-sm text-black/55">
                  {property.city} / {formatCurrency(guestPrice)} night / <Star className="inline-block" size={12} fill="currentColor" /> {property.rating || "New"}
                </p>
              </Link>
              <WishlistButton propertyId={property.id} isAuthenticated={isAuthenticated} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
