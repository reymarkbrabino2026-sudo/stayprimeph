"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2, PlayCircle, X } from "lucide-react";
import type { Property } from "@/lib/types";
import { getVirtualTourEmbed, normalizeVirtualTourUrl } from "@/lib/virtual-tour";

export function RoomVirtualTour({ property }: { property: Pick<Property, "title" | "virtualTourUrl"> }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [nativeFullscreenActive, setNativeFullscreenActive] = useState(false);

  useEffect(() => {
    function updateFullscreenState() {
      setNativeFullscreenActive(document.fullscreenElement === frameRef.current);
    }

    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  useEffect(() => {
    if (!fallbackFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fallbackFullscreen]);

  const tourUrl = normalizeVirtualTourUrl(property.virtualTourUrl);
  if (!tourUrl) return null;

  const embed = getVirtualTourEmbed(tourUrl);
  const fullscreenActive = fallbackFullscreen || nativeFullscreenActive;

  async function openFullscreen() {
    const frame = frameRef.current;

    if (frame?.requestFullscreen) {
      try {
        await frame.requestFullscreen();
        return;
      } catch {
        setFallbackFullscreen(true);
        return;
      }
    }

    setFallbackFullscreen(true);
  }

  async function closeFullscreen() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Keep the fallback overlay close available if the browser refuses to exit native fullscreen.
      }
    }

    setFallbackFullscreen(false);
  }

  return (
    <section className="overflow-x-hidden border-t border-black/10 bg-[#f4efe7] py-14 sm:py-16">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-5 sm:px-8 lg:px-12">
        <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">3D virtual tour</p>
            <h2 className="mt-3 max-w-full text-3xl font-semibold leading-tight tracking-normal sm:text-5xl lg:whitespace-nowrap">Walk through before you book</h2>
            <p className="mt-3 max-w-2xl leading-7 text-black/62 lg:max-w-none lg:whitespace-nowrap">Explore the space from room to room and get a clearer feel for the layout.</p>
          </div>
          {embed ? (
            <button
              type="button"
              onClick={openFullscreen}
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28] lg:justify-self-end"
            >
              <Maximize2 size={17} /> View fullscreen
            </button>
          ) : (
            <a
              href={tourUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28] lg:justify-self-end"
            >
              <ExternalLink size={17} /> Open tour
            </a>
          )}
        </div>

        {embed ? (
          <div
            id="virtual-tour"
            ref={frameRef}
            className={
              fullscreenActive
                ? "fixed inset-0 z-[100] h-[100dvh] w-full max-w-full overflow-hidden rounded-none border-0 bg-black shadow-none"
                : "relative mt-7 aspect-[4/3] w-full max-w-full scroll-mt-32 overflow-hidden rounded-[1.25rem] border border-black/10 bg-black shadow-[0_18px_50px_rgb(0_0_0_/_0.14)] sm:mt-8 sm:aspect-video sm:min-h-[24rem] sm:max-h-[calc(100svh-13rem)]"
            }
          >
            <iframe
              title={`Virtual tour of ${property.title}`}
              src={embed.embedUrl}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <div className="absolute right-3 top-3 z-10 flex gap-2 sm:right-4 sm:top-4">
              <a
                href={embed.originalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in provider"
                className="inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ExternalLink size={18} />
                <span className="sr-only">Open in provider</span>
              </a>
              <button
                type="button"
                onClick={fullscreenActive ? closeFullscreen : openFullscreen}
                title={fullscreenActive ? "Exit fullscreen" : "View fullscreen"}
                className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#083f35] shadow-lg transition hover:bg-[#f4efe7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {fullscreenActive ? <X size={19} /> : <Maximize2 size={19} />}
                <span className="sr-only">{fullscreenActive ? "Exit fullscreen" : "View fullscreen"}</span>
              </button>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur sm:bottom-4 sm:left-4">
              <PlayCircle size={16} /> {embed.providerLabel} tour
            </div>
          </div>
        ) : (
          <div id="virtual-tour" className="mt-8 scroll-mt-32 rounded-[1.75rem] border border-black/10 bg-white p-7">
            <p className="max-w-2xl leading-7 text-black/65">This host added a virtual tour link. Open it in a new tab to view the walkthrough.</p>
          </div>
        )}
      </div>
    </section>
  );
}
