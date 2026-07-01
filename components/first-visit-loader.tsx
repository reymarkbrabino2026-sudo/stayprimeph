"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

const storageKey = "hasSeenFirstVisitLoader";
const logoText = "stayprimeph.";
const minimumDisplayMs = 2200;
const maximumReadyWaitMs = 3200;

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
  const letters = useMemo(() => Array.from(logoText), []);

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
          <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8 text-center">
            <motion.div
              className="flex max-w-[92vw] flex-col items-center justify-center gap-4 text-white sm:flex-row sm:gap-6"
              initial={logoAnimation.initial}
              animate={logoAnimation.animate}
              transition={logoAnimation.transition}
            >
              <LoaderLogoMark />
              <div
                role="status"
                aria-live="polite"
                aria-label="StayPrimePH is loading"
                className="font-black leading-none [font-stretch:94%]"
                style={{ fontSize: "clamp(3rem, 9vw, 6.5rem)" }}
              >
                <span aria-hidden="true" className="block whitespace-nowrap">
                  {letters.map((letter, index) => (
                    <motion.span
                      key={`${letter}-${index}`}
                      className="inline-block origin-bottom whitespace-pre"
                      style={{ color: index < 4 ? "#ffffff" : "#9db3ac" }}
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1 }
                          : {
                              y: [0, -9, 3, 0],
                              rotate: [0, index % 2 === 0 ? -5 : 5, index % 3 === 0 ? 3 : -3, 0],
                            }
                      }
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 1.12,
                              delay: index * 0.055,
                              ease: "easeInOut",
                              repeat: Infinity,
                              repeatDelay: 0.28,
                            }
                      }
                    >
                      {letter === " " ? "\u00a0" : letter}
                    </motion.span>
                  ))}
                </span>
              </div>
            </motion.div>

            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/55" aria-hidden="true">
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

function LoaderLogoMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[clamp(4.5rem,18vw,8.5rem)] shrink-0 drop-shadow-[0_18px_36px_rgb(0_0_0_/_0.18)]"
      viewBox="895 438 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M942.49,438.98h-46.69v46.69c0,26.58,21.62,48.21,48.21,48.21h46.69v-46.69c0-26.58-21.62-48.21-48.21-48.21ZM958.76,489.9h-.03v33.76h-14.73c-10.65,0-20.28-4.41-27.19-11.5h25.21c2.92-.22,5.23-2.65,5.25-5.63v-19.13h0v-.08c0-3.32-2.69-6.01-6.01-6.01h-8.32c-2.87,0-5.2-2.33-5.2-5.2s2.33-5.2,5.2-5.2h9.56c8.99,0,16.27,7.29,16.27,16.27v2.72ZM980.47,523.66h-11.5v-36.47c0-14.63-11.86-26.49-26.49-26.49h-19.3c-3.14,0-5.68,2.54-5.68,5.68h0s0,19.36,0,19.36c0,3.21,2.61,5.81,5.81,5.81h13.73v10.41h-14.73c-8.95,0-16.29-7.32-16.31-16.27v-36.47h36.47c20.98,0,37.99,17.01,37.99,37.99v36.47Z"
      />
    </svg>
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
