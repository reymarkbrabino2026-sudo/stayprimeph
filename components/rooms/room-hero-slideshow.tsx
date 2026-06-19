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
    <div className="absolute inset-0">
      <Image
        key={slides[index].id}
        src={slides[index].imageUrl}
        alt={index === 0 ? alt : ""}
        fill
        priority={index === 0}
        sizes="100vw"
        className="object-cover transition-transform duration-[6500ms] ease-out scale-110"
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

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-16 z-10 px-3 sm:bottom-40 md:bottom-36 md:px-5">
          <div className="mx-auto flex max-w-[88rem] justify-center gap-2 px-5 md:justify-end md:px-8">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show photo ${slideIndex + 1}`}
                aria-current={slideIndex === index ? "true" : undefined}
                onClick={() => setIndex(slideIndex)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  slideIndex === index ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
