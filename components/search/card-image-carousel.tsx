"use client";

import Image from "next/image";
import { useRef, useState } from "react";

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
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`rounded-full bg-white transition-all ${index === active ? "size-1.5 opacity-100" : "size-1.5 opacity-55"}`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
