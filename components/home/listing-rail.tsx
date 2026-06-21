"use client";

import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeRailItem } from "@/lib/home-data";

export function ListingRail({
  title,
  items,
}: {
  title: string;
  items: HomeRailItem[];
}) {
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
        {items.map(([name, meta, rating, badge, imageId], index) => (
          <Link href={`/rooms/p${(index % 4) + 1}`} target="_blank" rel="noopener noreferrer" key={`${name}-${imageId}`} className="min-w-0 shrink-0 basis-[72vw] snap-start transition active:scale-[0.985] sm:basis-[calc((100%_-_1rem)/2)] md:basis-[calc((100%_-_3rem)/4)] xl:basis-[calc((100%_-_5rem)/6)] 2xl:basis-[calc((100%_-_6rem)/7)]">
            <div className="relative aspect-[1.08/1] overflow-hidden rounded-[1.25rem] bg-neutral-100 transition duration-300 md:hover:-translate-y-1">
              <Image
                src="/host-preview-house.jpg"
                alt={name}
                fill
                sizes="(min-width:1536px) 14vw, (min-width:1280px) 16vw, (min-width:768px) 24vw, 72vw"
                className="object-cover"
                preload={index === 0}
                loading={index === 0 ? "eager" : undefined}
              />
              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">{badge}</span>
              <span className="absolute right-3 top-3 grid size-8 place-items-center text-white drop-shadow">
                <Heart size={24} />
              </span>
            </div>
            <h3 className="mt-2 truncate text-sm font-semibold">{name}</h3>
            <p className="truncate text-sm text-black/55">
              {meta} · ★ {rating}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
