"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";

export function SearchResultsLayout({
  results,
  map,
  metaLabel = "",
}: {
  results: ReactNode;
  map: ReactNode;
  metaLabel?: string;
}) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <main className="lg:flex lg:min-h-[calc(100vh-150px)] lg:flex-row">
      <section
        className={`min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:order-1 lg:block lg:px-8 lg:pb-10 ${
          view === "map" ? "hidden lg:block" : "block"
        }`}
      >
        {results}
      </section>

      <div
        className={`lg:order-2 lg:block lg:w-[42%] lg:border-l xl:w-[44%] ${
          view === "map"
            ? "fixed inset-x-0 bottom-[64px] top-0 z-[95] block bg-white lg:static lg:bottom-auto lg:z-auto"
            : "hidden lg:block"
        }`}
      >
        {/* Compact Airbnb-style top bar — replaces the full search bar in the mobile map view */}
        {view === "map" ? (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-3 lg:hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Back to list"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-black/10 bg-white shadow-md transition active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-center shadow-md">
              <p className="truncate text-sm font-semibold">Homes in map area</p>
              {metaLabel ? <p className="truncate text-xs text-black/55">{metaLabel}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Filters"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-black/10 bg-white shadow-md transition active:scale-95"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        ) : null}

        <div className="h-full p-0 lg:sticky lg:top-0 lg:h-screen lg:p-6">{map}</div>
      </div>

      <button
        type="button"
        onClick={() => setView((current) => (current === "list" ? "map" : "list"))}
        className="fixed bottom-24 left-1/2 z-[96] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition active:scale-95 lg:hidden"
      >
        {view === "list" ? (
          <>
            <MapIcon size={16} aria-hidden="true" /> Map
          </>
        ) : (
          <>
            <List size={16} aria-hidden="true" /> List
          </>
        )}
      </button>
    </main>
  );
}
