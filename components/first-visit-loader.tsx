"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

const storageKey = "hasSeenFirstVisitLoader";
const minimumDisplayMs = 2200;
const maximumReadyWaitMs = 3200;

const logoGlyphs = [
  {
    fill: "#ffffff",
    d: "M796.85,627.74c-2.79,0-5.32-.26-7.59-.79-2.27-.53-4.22-1.29-5.85-2.29-1.63-1-2.95-2.2-3.95-3.6-1-1.4-1.66-2.96-1.98-4.7l8.7-3.56c.21,1.16.79,2.24,1.74,3.24.95,1,2.23,1.81,3.83,2.41,1.61.61,3.54.91,5.81.91,2.42,0,4.3-.36,5.61-1.07,1.32-.71,1.98-1.73,1.98-3.04,0-1-.37-1.79-1.11-2.37-.74-.58-1.82-1.08-3.24-1.5-1.42-.42-3.14-.82-5.14-1.19-1.95-.47-3.94-.97-5.97-1.5-2.03-.53-3.9-1.26-5.61-2.21-1.71-.95-3.11-2.2-4.19-3.76-1.08-1.55-1.62-3.54-1.62-5.97s.68-4.74,2.06-6.64c1.37-1.9,3.37-3.39,6.01-4.47,2.64-1.08,5.85-1.62,9.65-1.62,3.43,0,6.43.46,9.01,1.38,2.58.92,4.7,2.24,6.37,3.95,1.66,1.71,2.78,3.76,3.36,6.13l-9.25,3.08c-.21-1.27-.73-2.37-1.54-3.32-.82-.95-1.9-1.66-3.24-2.13-1.34-.47-2.91-.71-4.7-.71-2.27,0-4.02.37-5.26,1.11-1.24.74-1.86,1.71-1.86,2.93,0,1,.41,1.82,1.23,2.45.82.63,1.96,1.15,3.44,1.54,1.47.4,3.21.8,5.22,1.23,2.11.42,4.16.91,6.17,1.46,2,.55,3.81,1.28,5.42,2.17,1.61.9,2.89,2.08,3.83,3.56.95,1.48,1.42,3.37,1.42,5.69,0,2.74-.74,5.1-2.21,7.08-1.48,1.98-3.61,3.49-6.4,4.55-2.79,1.05-6.17,1.58-10.12,1.58Z",
  },
  {
    fill: "#ffffff",
    d: "M835.51,627.58c-4.64,0-8.05-1.23-10.24-3.68-2.19-2.45-3.28-6.36-3.28-11.74v-18.11h-6.01l.16-8.93h4.19c1.63,0,2.85-.24,3.64-.71.79-.47,1.27-1.34,1.42-2.61l1.03-5.93h6.48v9.25h10.52v9.25h-10.52v17.31c0,1.9.45,3.27,1.34,4.11.9.84,2.27,1.27,4.11,1.27,1,0,1.96-.11,2.89-.32.92-.21,1.73-.55,2.41-1.03v10.59c-1.63.53-3.14.87-4.51,1.03-1.37.16-2.58.24-3.64.24Z",
  },
  {
    fill: "#ffffff",
    d: "M858.05,627.74c-2.32,0-4.38-.46-6.17-1.38-1.79-.92-3.19-2.25-4.19-3.99-1-1.74-1.5-3.9-1.5-6.48,0-2.27.43-4.16,1.3-5.69.87-1.53,2.15-2.77,3.83-3.72,1.69-.95,3.77-1.74,6.25-2.37,2.48-.63,5.3-1.19,8.46-1.66,1.69-.26,3.07-.51,4.15-.75,1.08-.24,1.88-.63,2.41-1.19.53-.55.79-1.36.79-2.41,0-1.48-.53-2.74-1.58-3.8-1.06-1.05-2.72-1.58-4.98-1.58-1.53,0-2.94.26-4.23.79-1.29.53-2.4,1.32-3.32,2.37-.92,1.06-1.59,2.4-2.02,4.03l-10.04-3.08c.63-2.16,1.54-4.03,2.73-5.61,1.19-1.58,2.62-2.91,4.31-3.99,1.69-1.08,3.61-1.88,5.77-2.41,2.16-.53,4.51-.79,7.04-.79,4.06,0,7.37.65,9.92,1.94,2.56,1.29,4.47,3.29,5.73,6.01,1.27,2.72,1.9,6.21,1.9,10.48v7.12c0,1.85.04,3.72.12,5.61.08,1.9.18,3.81.32,5.73.13,1.92.28,3.83.43,5.73h-10.04c-.21-1.32-.41-2.83-.59-4.55-.19-1.71-.33-3.44-.44-5.18h-1.42c-.74,2-1.79,3.82-3.16,5.46-1.37,1.63-3.04,2.94-5.02,3.91s-4.23,1.46-6.76,1.46ZM862.87,619.52c1,0,2.02-.18,3.04-.55,1.03-.37,2.03-.88,3-1.54.97-.66,1.87-1.49,2.69-2.49.82-1,1.49-2.13,2.02-3.4l-.16-6.64,1.82.4c-.95.69-2.06,1.23-3.32,1.62-1.26.4-2.57.7-3.91.91-1.34.21-2.68.45-3.99.71-1.32.26-2.49.61-3.52,1.03-1.03.42-1.85.99-2.45,1.7-.61.71-.91,1.7-.91,2.97,0,1.63.53,2.93,1.58,3.87,1.05.95,2.42,1.42,4.11,1.42Z",
  },
  {
    fill: "#ffffff",
    d: "M906.99,641.02c-2.11,0-4.26-.2-6.44-.59-2.19-.4-4.24-1-6.17-1.82-1.93-.82-3.57-1.86-4.94-3.12l3.24-9.72c1.69,1.74,3.8,3.04,6.33,3.91,2.53.87,5.03,1.3,7.51,1.3,2.79,0,5.13-.57,7-1.7,1.87-1.13,3.29-2.87,4.27-5.22.97-2.34,1.54-5.28,1.7-8.82l.47-7.2h-1.74c-.53,3.48-1.38,6.32-2.57,8.54-1.19,2.21-2.69,3.83-4.51,4.86-1.82,1.03-3.97,1.54-6.44,1.54-3,0-5.53-.76-7.59-2.29-2.06-1.53-3.6-3.82-4.63-6.88-1.03-3.06-1.54-6.82-1.54-11.31v-17.39h11.39v14.63c0,4.9.55,8.43,1.66,10.6,1.11,2.16,2.79,3.24,5.06,3.24,1.21,0,2.32-.33,3.32-.99,1-.66,1.86-1.62,2.57-2.89.71-1.26,1.27-2.81,1.66-4.62.4-1.82.59-3.89.59-6.21v-13.76h11.39v30.52c0,3.32-.29,6.34-.87,9.05-.58,2.71-1.44,5.09-2.57,7.12-1.13,2.03-2.57,3.73-4.31,5.1-1.74,1.37-3.76,2.4-6.05,3.08-2.29.68-4.89,1.03-7.79,1.03Z",
  },
  {
    fill: "#9db3ac",
    d: "M935.69,639.91v-54.79h9.41l.08,11.54,1.42.08c.47-2.79,1.3-5.14,2.49-7.04,1.19-1.9,2.73-3.32,4.63-4.27,1.9-.95,4.08-1.42,6.56-1.42,3.69,0,6.85.91,9.49,2.73,2.64,1.82,4.65,4.38,6.05,7.67,1.4,3.29,2.1,7.18,2.1,11.66,0,4.16-.63,7.87-1.9,11.11-1.27,3.24-3.15,5.81-5.65,7.71-2.5,1.9-5.63,2.85-9.37,2.85-2.64,0-4.86-.5-6.68-1.5s-3.32-2.41-4.51-4.23c-1.19-1.82-2.17-3.99-2.96-6.52h-1.5c.32,1.42.61,2.87.87,4.35.26,1.48.47,2.91.63,4.31.16,1.4.24,2.75.24,4.07v11.7h-11.39ZM957.03,618.65c1.9,0,3.5-.53,4.82-1.58,1.32-1.05,2.33-2.53,3.04-4.43.71-1.9,1.07-4.06,1.07-6.48,0-2.64-.37-4.89-1.11-6.76-.74-1.87-1.79-3.33-3.16-4.39-1.37-1.05-3-1.58-4.9-1.58-1.69,0-3.14.37-4.35,1.11-1.21.74-2.23,1.71-3.04,2.93-.82,1.21-1.41,2.52-1.78,3.91-.37,1.4-.55,2.73-.55,3.99v1.5c0,1,.13,2.04.4,3.12.26,1.08.69,2.13,1.27,3.16.58,1.03,1.27,1.95,2.06,2.77.79.82,1.71,1.48,2.77,1.98,1.05.5,2.21.75,3.48.75Z",
  },
  {
    fill: "#9db3ac",
    d: "M982.97,626.63v-41.51h9.41l.08,14.15h1.5c.42-3.53,1.15-6.4,2.17-8.62,1.03-2.21,2.46-3.85,4.31-4.9,1.84-1.05,4.14-1.58,6.88-1.58.47,0,.99.01,1.54.04.55.03,1.2.12,1.94.28l-.47,12.1c-.79-.37-1.66-.63-2.61-.79-.95-.16-1.79-.24-2.53-.24-2.06,0-3.82.47-5.3,1.42-1.48.95-2.68,2.31-3.6,4.07-.92,1.77-1.54,3.91-1.86,6.44v19.13h-11.46Z",
  },
  {
    fill: "#9db3ac",
    d: "M1019.89,578.88c-2.21,0-3.91-.46-5.1-1.38-1.19-.92-1.78-2.28-1.78-4.07s.59-3.24,1.78-4.19c1.19-.95,2.89-1.42,5.1-1.42s3.99.47,5.18,1.42c1.19.95,1.78,2.35,1.78,4.19,0,1.74-.59,3.08-1.78,4.03-1.19.95-2.91,1.42-5.18,1.42ZM1014.12,626.63v-41.51h11.39v41.51h-11.39Z",
  },
  {
    fill: "#9db3ac",
    d: "M1032.86,626.63v-41.51h9.09v12.41h1.5c.74-3.06,1.71-5.57,2.93-7.55,1.21-1.98,2.67-3.46,4.39-4.47,1.71-1,3.73-1.5,6.05-1.5,2.48,0,4.53.55,6.17,1.66,1.63,1.11,2.9,2.65,3.8,4.63.9,1.98,1.47,4.39,1.74,7.23h1.26c.79-3.11,1.86-5.67,3.2-7.67,1.34-2,2.95-3.48,4.82-4.43,1.87-.95,3.94-1.42,6.21-1.42s4.26.45,5.97,1.34c1.71.9,3.15,2.23,4.31,3.99,1.16,1.77,2.03,3.98,2.61,6.64.58,2.66.87,5.73.87,9.21v21.43h-11.39v-20c0-2.85-.24-5.23-.71-7.16-.47-1.92-1.21-3.36-2.21-4.31-1-.95-2.29-1.42-3.87-1.42-1.74,0-3.24.59-4.51,1.78-1.26,1.19-2.27,2.81-3,4.86-.74,2.06-1.13,4.4-1.19,7.04v19.21h-11.15v-19.69c0-2.95-.26-5.39-.79-7.31-.53-1.92-1.29-3.39-2.29-4.39-1-1-2.27-1.5-3.8-1.5-1.79,0-3.32.59-4.59,1.78-1.27,1.19-2.24,2.83-2.93,4.94-.69,2.11-1.06,4.46-1.11,7.04v19.13h-11.39Z",
  },
  {
    fill: "#9db3ac",
    d: "M1123.78,627.74c-3.43,0-6.47-.47-9.13-1.42-2.66-.95-4.92-2.32-6.76-4.11-1.85-1.79-3.26-4-4.23-6.64-.98-2.63-1.46-5.61-1.46-8.93s.46-6.29,1.38-9.05c.92-2.77,2.28-5.17,4.07-7.19,1.79-2.03,3.98-3.6,6.56-4.7,2.58-1.11,5.51-1.66,8.78-1.66s5.98.51,8.46,1.54c2.48,1.03,4.55,2.57,6.21,4.63,1.66,2.06,2.87,4.57,3.64,7.55.76,2.98,1.04,6.39.83,10.24l-32.58.32v-6.25l26.01-.24-4.03,3.16c.37-2.79.18-5.09-.55-6.88-.74-1.79-1.81-3.11-3.2-3.95-1.4-.84-2.94-1.26-4.63-1.26-2,0-3.77.53-5.3,1.58-1.53,1.06-2.72,2.6-3.56,4.63-.84,2.03-1.27,4.47-1.27,7.31,0,4.48.99,7.78,2.97,9.88,1.98,2.11,4.57,3.16,7.79,3.16,1.47,0,2.73-.2,3.76-.59s1.87-.91,2.53-1.54c.66-.63,1.19-1.34,1.58-2.13.4-.79.72-1.58.99-2.37l9.88,2.13c-.47,1.95-1.17,3.7-2.1,5.26-.92,1.56-2.15,2.9-3.68,4.03-1.53,1.13-3.36,2-5.5,2.61-2.13.6-4.63.91-7.47.91Z",
  },
];

function hasSeenLoader() {
  try {
    return window.localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

function saveSeenLoader() {
  try {
    window.localStorage.setItem(storageKey, "true");
  } catch {
    // Private browsing or strict storage settings can block localStorage.
  }
}

export function FirstVisitLoader() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [isVisible, setIsVisible] = useState(true);
  const shouldSaveSeenFlag = useRef(false);
  const previousBodyOverflow = useRef<string | null>(null);

  useEffect(() => {
    const bootState = document.documentElement.dataset.firstVisitLoader;

    if (bootState === "seen" || (bootState !== "active" && hasSeenLoader())) {
      const hideTimer = window.setTimeout(() => setIsVisible(false), 0);
      document.documentElement.dataset.firstVisitLoader = "seen";
      setAppContentInert(false);
      return () => window.clearTimeout(hideTimer);
    }

    document.documentElement.dataset.firstVisitLoader = "active";
    shouldSaveSeenFlag.current = true;
    saveSeenLoader();
    setAppContentInert(true);
    previousBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const startedAt = performance.now();
    let hasStartedExit = false;
    let exitTimer = 0;
    let fallbackTimer = 0;
    let frameOne = 0;
    let frameTwo = 0;

    const startExit = () => {
      if (hasStartedExit) return;
      hasStartedExit = true;
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, minimumDisplayMs - elapsed);
      exitTimer = window.setTimeout(() => setIsVisible(false), remaining);
    };

    const startExitAfterPaint = () => {
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(startExit);
      });
    };

    if (document.readyState === "complete") {
      startExitAfterPaint();
    } else {
      window.addEventListener("load", startExitAfterPaint, { once: true });
    }

    fallbackTimer = window.setTimeout(startExit, maximumReadyWaitMs);

    return () => {
      window.removeEventListener("load", startExitAfterPaint);
      window.clearTimeout(exitTimer);
      window.clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      setAppContentInert(false);
      restoreBodyOverflow(previousBodyOverflow);
    };
  }, []);

  function handleExitComplete() {
    if (shouldSaveSeenFlag.current) saveSeenLoader();
    document.documentElement.dataset.firstVisitLoader = "seen";
    setAppContentInert(false);
    restoreBodyOverflow(previousBodyOverflow);
  }

  const logoAnimation = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.35, ease: "easeOut" as const },
      }
    : {
        initial: { opacity: 0, scale: 0.85, y: 12 },
        animate: { opacity: 1, scale: [0.85, 1.06, 0.98, 1], y: [12, -5, 1, 0] },
        transition: { duration: 0.78, ease: [0.16, 1, 0.3, 1] as const, times: [0, 0.62, 0.84, 1] },
      };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible ? (
        <motion.div
          className="first-visit-loader pointer-events-auto fixed inset-0 z-[2147483000] grid h-dvh w-screen place-items-center overflow-hidden px-5 text-[#08382f]"
          data-testid="first-visit-loader"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
          transition={{ duration: shouldReduceMotion ? 0.32 : 0.62, ease: "easeOut" }}
          style={{
            backgroundImage: "linear-gradient(135deg, #05261f 0%, #08382f 42%, #0b5748 72%, #5f8374 100%)",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.1),transparent_36%,rgb(0_0_0_/_0.14))]" />
          <div className="relative z-10 flex w-full flex-col items-center justify-center gap-6 text-center">
            <motion.div
              className="flex max-w-[92vw] flex-col items-center justify-center text-white"
              initial={logoAnimation.initial}
              animate={logoAnimation.animate}
              transition={logoAnimation.transition}
            >
              <LoaderLogoArtwork shouldReduceMotion={shouldReduceMotion} />
            </motion.div>

            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/45" aria-hidden="true">
              <motion.span
                className="block h-full w-1/2 rounded-full bg-white"
                animate={shouldReduceMotion ? { opacity: 0.75 } : { x: ["-100%", "220%"] }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.05, ease: "easeInOut", repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LoaderLogoArtwork({ shouldReduceMotion }: { shouldReduceMotion: boolean }) {
  return (
    <motion.svg
      role="status"
      aria-live="polite"
      aria-label="StayPrimePH is loading"
      className="h-auto w-[min(64vw,18rem)] drop-shadow-[0_18px_36px_rgb(0_0_0_/_0.18)] sm:w-[min(36vw,20rem)]"
      viewBox="760 420 400 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        fill="#ffffff"
        d="M942.49,438.98h-46.69v46.69c0,26.58,21.62,48.21,48.21,48.21h46.69v-46.69c0-26.58-21.62-48.21-48.21-48.21ZM958.76,489.9h-.03v33.76h-14.73c-10.65,0-20.28-4.41-27.19-11.5h25.21c2.92-.22,5.23-2.65,5.25-5.63v-19.13h0v-.08c0-3.32-2.69-6.01-6.01-6.01h-8.32c-2.87,0-5.2-2.33-5.2-5.2s2.33-5.2,5.2-5.2h9.56c8.99,0,16.27,7.29,16.27,16.27v2.72ZM980.47,523.66h-11.5v-36.47c0-14.63-11.86-26.49-26.49-26.49h-19.3c-3.14,0-5.68,2.54-5.68,5.68h0s0,19.36,0,19.36c0,3.21,2.61,5.81,5.81,5.81h13.73v10.41h-14.73c-8.95,0-16.29-7.32-16.31-16.27v-36.47h36.47c20.98,0,37.99,17.01,37.99,37.99v36.47Z"
        animate={shouldReduceMotion ? { opacity: 1 } : { y: [0, -5, 0], scale: [1, 1.025, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.6, ease: "easeInOut", repeat: Infinity }}
      />
      {logoGlyphs.map((glyph, index) => (
        <motion.path
          key={`${glyph.fill}-${index}`}
          fill={glyph.fill}
          d={glyph.d}
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : {
                  y: [0, -5, 2, 0],
                  rotate: [0, index % 2 === 0 ? -3 : 3, index % 3 === 0 ? 2 : -2, 0],
                }
          }
          style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: 1.18,
                  delay: index * 0.055,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.32,
                }
          }
        />
      ))}
    </motion.svg>
  );
}

function restoreBodyOverflow(previousBodyOverflow: MutableRefObject<string | null>) {
  if (previousBodyOverflow.current === null) return;
  document.body.style.overflow = previousBodyOverflow.current;
  previousBodyOverflow.current = null;
}

function setAppContentInert(isInert: boolean) {
  const appContent = document.getElementById("app-content");
  if (!appContent) return;

  if (isInert) {
    appContent.setAttribute("inert", "");
    appContent.setAttribute("aria-hidden", "true");
    return;
  }

  appContent.removeAttribute("inert");
  appContent.removeAttribute("aria-hidden");
}
