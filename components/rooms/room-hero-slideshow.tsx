"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface Slide {
  id: string;
  imageUrl: string;
}

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export function RoomHeroSlideshow({ images, alt }: { images: Slide[]; alt: string }) {
  const slides = images.filter((image) => isRenderableImage(image.imageUrl));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return <div className="absolute inset-0 bg-gradient-to-br from-[#31281d] via-[#705c3d] to-[#1f1f1f]" />;
  }

  return (
    <div className="absolute inset-0 bg-[#14120f]">
      <Image
        key={slides[index].id}
        src={slides[index].imageUrl}
        alt={index === 0 ? alt : ""}
        fill
        priority={index === 0}
        sizes="100vw"
        className="object-cover object-center transition-transform duration-[6500ms] ease-out sm:scale-110"
      />

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-6 sm:grid"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setIndex((current) => (current + 1) % slides.length)}
            className="absolute right-4 top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-6 sm:grid"
          >
            <ChevronRight size={22} />
          </button>
        </>
      ) : null}
    </div>
  );
}
