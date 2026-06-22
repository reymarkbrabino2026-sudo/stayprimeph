"use client";

import { useState, type ReactNode } from "react";
import { List, Map as MapIcon } from "lucide-react";

export function SearchResultsLayout({ results, map }: { results: ReactNode; map: ReactNode }) {
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
          view === "map" ? "fixed inset-0 z-40 block bg-white lg:static lg:z-auto" : "hidden lg:block"
        }`}
      >
        <div className="h-full p-3 sm:p-4 lg:sticky lg:top-0 lg:h-screen lg:p-6">{map}</div>
      </div>

      <button
        type="button"
        onClick={() => setView((current) => (current === "list" ? "map" : "list"))}
        className="fixed bottom-24 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition active:scale-95 lg:hidden"
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
