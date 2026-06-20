"use client";

import { useEffect } from "react";

// Minimal local types so tsc never has to resolve Lenis's own (crash-prone) d.ts.
type LenisInstance = { raf: (time: number) => void; destroy: () => void };
type LenisModule = {
  default: new (options: { duration?: number; smoothWheel?: boolean }) => LenisInstance;
};

// Momentum smooth scrolling (Lenis) on desktop only. Mobile keeps native scroll,
// and users who prefer reduced motion are left on native scroll too.
export function SmoothScroll() {
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!desktop.matches || reduceMotion.matches) return;

    let cancelled = false;
    let frame = 0;
    let lenis: LenisInstance | null = null;

    (async () => {
      const mod = (await import("lenis")) as unknown as LenisModule;
      if (cancelled) return;
      lenis = new mod.default({ duration: 1.1, smoothWheel: true });

      function raf(time: number) {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      }
      frame = requestAnimationFrame(raf);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);

  return null;
}
