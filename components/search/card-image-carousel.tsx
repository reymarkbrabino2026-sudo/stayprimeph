"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type MouseEvent } from "react";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export function CardImageCarousel({
  images,
  alt,
  priority = false,
}: {
  images: { imageUrl: string; tone?: string | null }[];
  alt: string;
  priority?: boolean;
}) {
  const slides = images.filter((image) => isRenderableImage(image.imageUrl));
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goToSlide(index: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const nextIndex = Math.min(Math.max(index, 0), slides.length - 1);
    setActive(nextIndex);
    scrollRef.current?.scrollTo({
      left: nextIndex * scrollRef.current.clientWidth,
      behavior: "smooth",
    });
  }

  if (slides.length === 0) return null;

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar touch-scroll flex h-full w-full snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((image, index) => (
          <div key={`${image.imageUrl}-${index}`} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={image.imageUrl}
              alt={alt}
              fill
              sizes="(min-width:1280px) 24vw, (min-width:768px) 48vw, 100vw"
              className="object-cover"
              priority={priority && index === 0}
            />
          </div>
        ))}
      </div>
      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => goToSlide(active - 1, event)}
            disabled={active === 0}
            aria-label="Show previous photo"
            className="absolute left-2 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-md transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={(event) => goToSlide(active + 1, event)}
            disabled={active >= slides.length - 1}
            aria-label="Show next photo"
            className="absolute right-2 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-md transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1.5">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`rounded-full bg-white transition-all ${index === active ? "h-1.5 w-2 opacity-100" : "size-1.5 opacity-60"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
