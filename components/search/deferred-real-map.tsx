"use client";

import { useCallback, useEffect, useState } from "react";
import { RealMap } from "@/components/search/real-map";
import type { PublicListingSummary } from "@/lib/types";

const desktopMediaQuery = "(min-width: 1024px)";

function MapPlaceholder() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-none bg-[#e9f0ea] lg:rounded-[2rem]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.5)_1px,transparent_1px),linear-gradient(0deg,rgb(255_255_255_/_0.45)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute left-6 top-6 h-16 w-52 rounded-2xl bg-white/85 shadow-sm" />
      <div className="absolute left-[18%] top-[34%] h-9 w-20 rounded-full bg-white shadow-[0_10px_25px_rgb(0_0_0_/_0.12)]" />
      <div className="absolute right-[22%] top-[48%] h-9 w-24 rounded-full bg-white shadow-[0_10px_25px_rgb(0_0_0_/_0.12)]" />
      <div className="absolute bottom-6 left-1/2 h-11 w-52 -translate-x-1/2 rounded-full bg-black/85" />
    </div>
  );
}

export function DeferredRealMap({ properties, location }: { properties: PublicListingSummary[]; location?: string }) {
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const loadMap = useCallback(() => setShouldLoadMap(true), []);

  useEffect(() => {
    if (shouldLoadMap) return;

    const media = window.matchMedia(desktopMediaQuery);
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function cancelScheduledLoad() {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      idleId = undefined;
      timeoutId = undefined;
    }

    function scheduleIdleLoad() {
      cancelScheduledLoad();
      if (!media.matches) return;

      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(loadMap, { timeout: 2500 });
        return;
      }

      timeoutId = setTimeout(loadMap, 1400);
    }

    function handleMediaChange(event: MediaQueryListEvent) {
      if (event.matches) scheduleIdleLoad();
      else cancelScheduledLoad();
    }

    scheduleIdleLoad();
    media.addEventListener("change", handleMediaChange);

    return () => {
      cancelScheduledLoad();
      media.removeEventListener("change", handleMediaChange);
    };
  }, [loadMap, shouldLoadMap]);

  if (shouldLoadMap) {
    return <RealMap properties={properties} location={location} />;
  }

  return (
    <div
      className="h-full w-full"
      onFocus={loadMap}
      onPointerDown={loadMap}
      onPointerEnter={loadMap}
      onTouchStart={loadMap}
      tabIndex={0}
      aria-label="Map"
    >
      <MapPlaceholder />
    </div>
  );
}
