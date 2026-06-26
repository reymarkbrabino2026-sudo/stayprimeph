"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Images } from "lucide-react";

interface Slide {
  id: string;
  imageUrl: string;
}

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

const AUTOPLAY_MS = 4500;

export function RoomGalleryCarousel({
  images,
  title,
  onShowAllPhotos,
}: {
  images: Slide[];
  title: string;
  onShowAllPhotos?: () => void;
}) {
  const realCount = images.length;
  const loop = realCount > 1;

  // For a seamless infinite carousel we clone the last image before the first
  // and the first image after the last. Scrolling into a clone is invisibly
  // snapped back to its real counterpart once the scroll settles.
  // Extended index map: 0 = clone(last), 1..realCount = real, realCount+1 = clone(first).
  const slides = loop ? [images[realCount - 1], ...images, images[0]] : images;
  const firstRealIndex = loop ? 1 : 0;

  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [current, setCurrent] = useState(0);

  function realIndexFor(extIndex: number) {
    if (!loop) return extIndex;
    if (extIndex === 0) return realCount - 1;
    if (extIndex === realCount + 1) return 0;
    return extIndex - 1;
  }

  function nearestExtIndex() {
    const track = trackRef.current;
    if (!track) return firstRealIndex;
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = firstRealIndex;
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

  const centerTo = useCallback((extIndex: number, smooth: boolean) => {
    const track = trackRef.current;
    const element = slideRefs.current[extIndex];
    if (!track || !element) return;
    track.scrollTo({
      left: element.offsetLeft - (track.clientWidth - element.clientWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Start on the first real slide (skip the leading clone) without animation.
  useEffect(() => {
    if (loop) centerTo(firstRealIndex, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, centerTo]);

  function go(direction: number) {
    centerTo(nearestExtIndex() + direction, true);
  }

  useEffect(() => {
    if (!loop) return;
    const timer = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop]);

  function handleScroll() {
    const nearest = nearestExtIndex();
    setCurrent(realIndexFor(nearest));
    if (!loop) return;

    // After scrolling settles on a clone, jump instantly to the real twin so the
    // loop continues forever in either direction.
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const settled = nearestExtIndex();
      if (settled === 0) centerTo(realCount, false);
      else if (settled === realCount + 1) centerTo(1, false);
    }, 140);
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1.25rem,calc((100%_-_980px)/2))] pb-2 sm:gap-5"
      >
        {slides.map((slide, index) => {
          const realIndex = realIndexFor(index);
          const active = realIndex === current;
          return (
            <div
              key={`${slide.id}-${index}`}
              ref={(element) => {
                slideRefs.current[index] = element;
              }}
              className={`relative aspect-[49/29] w-[min(980px,88vw)] shrink-0 snap-center overflow-hidden rounded-lg bg-[#e9e2d6] transition-opacity duration-500 ${
                active ? "opacity-100" : "opacity-55"
              }`}
            >
              {isRenderableImage(slide.imageUrl) ? (
                <button
                  type="button"
                  onClick={onShowAllPhotos}
                  disabled={!onShowAllPhotos}
                  aria-label={`Show all photos for ${title}`}
                  className="group relative block h-full w-full cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35] disabled:cursor-default"
                >
                  <Image
                    src={slide.imageUrl}
                    alt={`${title} photo ${realIndex + 1}`}
                    fill
                    sizes="(min-width:1024px) 980px, 90vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  />
                </button>
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#e7dfd2] to-[#c8d8d1]" />
              )}
            </div>
          );
        })}
      </div>

      {onShowAllPhotos ? (
        <button
          type="button"
          onClick={onShowAllPhotos}
          className="absolute bottom-5 right-[max(1.25rem,calc((100%_-_980px)/2))] z-20 inline-flex min-h-11 items-center gap-2 rounded-md border border-black/15 bg-white px-4 text-sm font-semibold text-[#111111] shadow-[0_10px_30px_rgb(0_0_0_/_0.18)] transition hover:bg-[#f7f5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
        >
          <Images size={18} />
          Show all photos
        </button>
      ) : null}

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
