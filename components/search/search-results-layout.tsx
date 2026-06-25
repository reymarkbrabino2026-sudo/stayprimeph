"use client";

import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";

type PreviewAwareMapProps = {
  onPreviewOpenChange?: (open: boolean) => void;
};

export function SearchResultsLayout({
  results,
  map,
  filters,
  mobileSearch,
  metaLabel = "",
  title = "Homes in map area",
  count,
}: {
  results: ReactNode;
  map: ReactNode;
  filters?: ReactNode;
  mobileSearch?: ReactNode;
  metaLabel?: string;
  title?: string;
  count?: number;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapPreviewOpen, setMapPreviewOpen] = useState(false);
  const renderedMap = isValidElement<PreviewAwareMapProps>(map)
    ? cloneElement(map as ReactElement<PreviewAwareMapProps>, { onPreviewOpenChange: setMapPreviewOpen })
    : map;

  return (
    <main className="relative min-h-[90vh] overflow-x-hidden bg-[#e9f0ea] lg:flex lg:min-h-[calc(100vh-150px)] lg:flex-row lg:bg-white">
      <div className="fixed inset-x-0 top-0 z-[110] flex items-center gap-2 px-3 pt-3 lg:hidden">
        <Link
          href="/"
          aria-label="Back to home"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-black/10 bg-white shadow-md transition active:scale-95"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          {mobileSearch ?? (
            <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-center shadow-md">
              <p className="truncate text-sm font-semibold">{title}</p>
              {metaLabel ? <p className="truncate text-xs text-black/55">{metaLabel}</p> : null}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label="Filters"
          disabled={!filters}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-black/10 bg-white shadow-md transition active:scale-95 disabled:opacity-45"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {filtersOpen && filters ? (
        <div className="fixed inset-0 z-[120] bg-black/35 px-3 pt-20 lg:hidden" data-lenis-prevent>
          <div className="mx-auto max-w-md rounded-[1.5rem] bg-white p-4 shadow-[0_18px_50px_rgb(0_0_0_/_0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">Filters</p>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-black/[0.06]"
              >
                <X size={16} />
              </button>
            </div>
            {filters}
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 top-0 z-0 h-[90vh] w-screen lg:static lg:inset-auto lg:order-2 lg:z-auto lg:h-auto lg:w-[42%] lg:border-l xl:w-[44%]">
        <div className="h-full lg:sticky lg:top-0 lg:h-screen lg:p-6">{renderedMap}</div>
      </div>

      <section className={`relative z-10 mt-[calc(90vh-9.75rem)] min-h-screen rounded-t-[1.75rem] bg-white px-4 pb-28 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.14)] transition-opacity duration-150 sm:px-6 lg:order-1 lg:z-auto lg:mt-0 lg:min-h-0 lg:flex-1 lg:rounded-none lg:px-8 lg:pb-10 lg:pt-5 lg:opacity-100 lg:shadow-none ${mapPreviewOpen ? "pointer-events-none opacity-0 lg:pointer-events-auto" : "opacity-100"}`}>
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-black/15 lg:hidden" />
        {typeof count === "number" ? (
          <p className="mb-3 text-center text-sm font-semibold lg:hidden">
            {count} {count === 1 ? "home" : "homes"}
          </p>
        ) : null}
        {filters ? <div className="hidden border-b pb-5 lg:block">{filters}</div> : null}
        {results}
      </section>
    </main>
  );
}
