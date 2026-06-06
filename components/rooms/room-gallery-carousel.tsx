"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Slide {
  id: string;
  imageUrl: string;
}

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

const AUTOPLAY_MS = 4500;

export function RoomGalleryCarousel({ images, title }: { images: Slide[]; title: string }) {
  const realCount = images.length;
  const loop = realCount > 1;
  // Triple the slides so there's always a neighbour to scroll into; we silently
  // recenter into the middle copy whenever the scroll drifts into an outer copy.
  const slides = loop ? [...images, ...images, ...images] : images;
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [current, setCurrent] = useState(0);

  function nearestIndex() {
    const track = trackRef.current;
    if (!track) return current;
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let minDistance = Infinity;
    slideRefs.current.forEach((element, index) => {
      if (!element) return;
      const slideCenter = element.offsetLeft + element.offsetWidth / 2;
      const distance = Math.abs(slideCenter - center);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = index;
      }
    });
    return nearest;
  }

  function centerTo(index: number, smooth: boolean) {
    const track = trackRef.current;
    const element = slideRefs.current[index];
    if (!track || !element) return;
    track.scrollTo({
      left: element.offsetLeft - (track.clientWidth - element.clientWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function go(direction: number) {
    centerTo(nearestIndex() + direction, true);
  }

  useEffect(() => {
    if (loop) centerTo(realCount, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loop) return;
    const timer = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop]);

  function handleScroll() {
    setCurrent(nearestIndex());
    if (!loop) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const nearest = nearestIndex();
      if (nearest < realCount || nearest >= realCount * 2) {
        centerTo(realCount + (nearest % realCount), false);
      }
    }, 150);
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1.25rem,calc((100%-980px)/2))] pb-2 sm:gap-5"
      >
        {slides.map((slide, index) => {
          const active = index === current;
          return (
            <div
              key={`${slide.id}-${index}`}
              ref={(element) => {
                slideRefs.current[index] = element;
              }}
              className={`relative aspect-[49/29] w-[min(980px,88vw)] shrink-0 snap-center overflow-hidden rounded-[1.5rem] bg-[#e9e2d6] transition-opacity duration-500 ${
                active ? "opacity-100" : "opacity-55"
              }`}
            >
              {isRenderableImage(slide.imageUrl) ? (
                <Image
                  src={slide.imageUrl}
                  alt={`${title} photo ${(index % realCount) + 1}`}
                  fill
                  sizes="(min-width:1024px) 980px, 90vw"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#e7dfd2] to-[#c8d8d1]" />
              )}
            </div>
          );
        })}
      </div>

      {loop ? (
        <div className="mt-6 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="grid size-11 place-items-center rounded-full text-[#083f35] transition hover:bg-black/[0.06]"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="grid size-11 place-items-center rounded-full text-[#083f35] transition hover:bg-black/[0.06]"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
