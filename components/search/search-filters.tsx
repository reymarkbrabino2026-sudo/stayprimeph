"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TypeOption = { value: string; label: string };

type SearchFiltersProps = {
  types: TypeOption[];
  amenities: string[];
  current: {
    type: string;
    minPrice: string;
    maxPrice: string;
    beds: string;
    amenities: string[];
  };
};

const BED_OPTIONS = ["1", "2", "3", "4"];
const FILTER_KEYS = ["type", "minPrice", "maxPrice", "beds", "amenities"];

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-0 top-[calc(100%+8px)] z-[60] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-4 shadow-[0_18px_50px_rgb(0_0_0_/_0.18)]">
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${active ? "border-black bg-black text-white" : "border-black/15 hover:border-black"}`}
    >
      {children}
    </button>
  );
}

function ApplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-10 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]">
      Apply
    </button>
  );
}

export function SearchFilters({ types, amenities, current }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(current.amenities);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/search?${params.toString()}`);
    setOpen(null);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    setMinPrice("");
    setMaxPrice("");
    setSelectedAmenities([]);
    router.push(`/search?${params.toString()}`);
    setOpen(null);
  }

  const hasPrice = Boolean(current.minPrice || current.maxPrice);
  const activeCount = useMemo(
    () => [current.type, hasPrice ? "p" : "", current.beds, current.amenities.length ? "a" : ""].filter(Boolean).length,
    [current, hasPrice],
  );

  const chip = (active: boolean) =>
    `min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-black bg-black text-white" : "border-black/15 active:border-black md:hover:border-black"}`;

  return (
    <div ref={containerRef} className="relative">
      <div className="no-scrollbar touch-scroll flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setOpen(open === "type" ? null : "type")} className={chip(Boolean(current.type))}>
          {current.type ? types.find((t) => t.value === current.type)?.label ?? "Type" : "Type of place"}
        </button>
        <button type="button" onClick={() => setOpen(open === "price" ? null : "price")} className={chip(hasPrice)}>
          {hasPrice ? "Price set" : "Price"}
        </button>
        <button type="button" onClick={() => setOpen(open === "beds" ? null : "beds")} className={chip(Boolean(current.beds))}>
          {current.beds ? `${current.beds}+ beds` : "Rooms & beds"}
        </button>
        {amenities.length > 0 ? (
          <button type="button" onClick={() => setOpen(open === "amenities" ? null : "amenities")} className={chip(current.amenities.length > 0)}>
            {current.amenities.length ? `Amenities (${current.amenities.length})` : "Amenities"}
          </button>
        ) : null}
        {activeCount > 0 ? (
          <button type="button" onClick={clearAll} className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-[#083f35] underline underline-offset-4">
            Clear all
          </button>
        ) : null}
      </div>

      {open === "type" ? (
        <Panel>
          <p className="mb-3 text-sm font-semibold">Type of place</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={!current.type} onClick={() => pushParams({ type: null })}>Any</Pill>
            {types.map((t) => (
              <Pill key={t.value} active={current.type === t.value} onClick={() => pushParams({ type: t.value })}>
                {t.label}
              </Pill>
            ))}
          </div>
        </Panel>
      ) : null}

      {open === "price" ? (
        <Panel>
          <p className="mb-3 text-sm font-semibold">Price per night (PHP)</p>
          <div className="flex items-center gap-3">
            <input
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ""))}
              placeholder="Min"
              aria-label="Minimum price"
              className="w-28 rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#083f35]"
            />
            <span className="text-black/40">-</span>
            <input
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))}
              placeholder="Max"
              aria-label="Maximum price"
              className="w-28 rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#083f35]"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <ApplyButton onClick={() => pushParams({ minPrice: minPrice || null, maxPrice: maxPrice || null })} />
          </div>
        </Panel>
      ) : null}

      {open === "beds" ? (
        <Panel>
          <p className="mb-3 text-sm font-semibold">Minimum bedrooms</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={!current.beds} onClick={() => pushParams({ beds: null })}>Any</Pill>
            {BED_OPTIONS.map((b) => (
              <Pill key={b} active={current.beds === b} onClick={() => pushParams({ beds: b })}>
                {b}+
              </Pill>
            ))}
          </div>
        </Panel>
      ) : null}

      {open === "amenities" ? (
        <Panel>
          <p className="mb-3 text-sm font-semibold">Amenities</p>
          <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {amenities.map((a) => {
              const checked = selectedAmenities.includes(a);
              return (
                <label key={a} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-black/[0.04]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedAmenities((s) => (checked ? s.filter((x) => x !== a) : [...s, a]))}
                    className="size-4 rounded border-black/30"
                  />
                  {a}
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <ApplyButton onClick={() => pushParams({ amenities: selectedAmenities.length ? selectedAmenities.join(",") : null })} />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
