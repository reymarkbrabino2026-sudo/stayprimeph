"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { normalizeAmenityLabel, quickAmenityFilters, resolveAmenityFilterValue } from "@/lib/amenity-filters";

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
  compact?: boolean;
};

const BED_OPTIONS = ["1", "2", "3", "4"];
const FILTER_KEYS = ["type", "minPrice", "maxPrice", "beds", "amenities"];

function Panel({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <div className={`absolute top-[calc(100%+8px)] z-[60] w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-4 shadow-[0_18px_50px_rgb(0_0_0_/_0.18)] ${align === "right" ? "right-0" : "left-0"}`}>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${
        active ? "border-black bg-black text-white" : "border-black/15 hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}

function sameAmenity(a: string, b: string) {
  return normalizeAmenityLabel(a) === normalizeAmenityLabel(b);
}

export function SearchFilters({ types, amenities, current, compact = false }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(current.type);
  const [selectedBeds, setSelectedBeds] = useState(current.beds);
  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(current.amenities);

  function resetDraftFromCurrent() {
    setSelectedType(current.type);
    setSelectedBeds(current.beds);
    setMinPrice(current.minPrice);
    setMaxPrice(current.maxPrice);
    setSelectedAmenities(current.amenities);
  }

  function toggleFiltersPanel() {
    if (!open) resetDraftFromCurrent();
    setOpen((value) => !value);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
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
    setOpen(false);
  }

  function applyFilters() {
    pushParams({
      type: selectedType || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      beds: selectedBeds || null,
      amenities: selectedAmenities.length ? selectedAmenities.join(",") : null,
    });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    setSelectedType("");
    setSelectedBeds("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedAmenities([]);
    router.push(`/search?${params.toString()}`);
    setOpen(false);
  }

  const quickFilters = useMemo(
    () => quickAmenityFilters.map((filter) => ({
      label: filter.label,
      value: resolveAmenityFilterValue(amenities, filter),
    })),
    [amenities],
  );

  const amenityOptions = useMemo(() => {
    const options = [...amenities, ...current.amenities, ...quickFilters.map((filter) => filter.value)];
    return Array.from(new Map(options.map((amenity) => [normalizeAmenityLabel(amenity), amenity])).values())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [amenities, current.amenities, quickFilters]);

  function toggleQuickAmenity(value: string) {
    const selected = current.amenities.some((amenity) => sameAmenity(amenity, value));
    const nextAmenities = selected
      ? current.amenities.filter((amenity) => !sameAmenity(amenity, value))
      : [...current.amenities, value];

    setSelectedAmenities(nextAmenities);
    pushParams({ amenities: nextAmenities.length ? nextAmenities.join(",") : null });
  }

  const hasPrice = Boolean(current.minPrice || current.maxPrice);
  const activeCount = useMemo(
    () => [current.type, hasPrice ? "p" : "", current.beds, current.amenities.length ? "a" : ""].filter(Boolean).length,
    [current, hasPrice],
  );

  const chip = (active: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active ? "border-black bg-black text-white" : "border-black/15 bg-white active:border-black md:hover:border-black"
    }`;

  return (
    <div ref={containerRef} className="relative">
      <div className={`no-scrollbar touch-scroll flex min-w-0 items-center gap-2 overflow-x-auto ${compact ? "" : "pb-1"}`}>
        <button type="button" onClick={toggleFiltersPanel} className={chip(activeCount > 0)}>
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {activeCount > 0 ? (
            <span className={`grid size-5 place-items-center rounded-full text-xs ${activeCount > 0 ? "bg-white text-black" : "bg-black text-white"}`}>
              {activeCount}
            </span>
          ) : null}
        </button>

        {!compact && quickFilters.map((filter) => {
          const active = current.amenities.some((amenity) => sameAmenity(amenity, filter.value));
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => toggleQuickAmenity(filter.value)}
              className={chip(active)}
            >
              {filter.label}
            </button>
          );
        })}

        {!compact && activeCount > 0 ? (
          <button type="button" onClick={clearAll} className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-[#083f35] underline underline-offset-4">
            Clear all
          </button>
        ) : null}
      </div>

      {open ? (
        <Panel align={compact ? "right" : "left"}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold">Filters</p>
              <p className="mt-1 text-sm text-black/55">Refine the homes shown in this map area.</p>
            </div>
            {activeCount > 0 ? (
              <button type="button" onClick={clearAll} className="text-sm font-semibold text-[#083f35] underline underline-offset-4">
                Clear all
              </button>
            ) : null}
          </div>

          <div className="mt-5 space-y-5">
            <section>
              <p className="mb-3 text-sm font-semibold">Type of place</p>
              <div className="flex flex-wrap gap-2">
                <Pill active={!selectedType} onClick={() => setSelectedType("")}>Any</Pill>
                {types.map((type) => (
                  <Pill key={type.value} active={selectedType === type.value} onClick={() => setSelectedType(type.value)}>
                    {type.label}
                  </Pill>
                ))}
              </div>
            </section>

            <section>
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
            </section>

            <section>
              <p className="mb-3 text-sm font-semibold">Minimum bedrooms</p>
              <div className="flex flex-wrap gap-2">
                <Pill active={!selectedBeds} onClick={() => setSelectedBeds("")}>Any</Pill>
                {BED_OPTIONS.map((beds) => (
                  <Pill key={beds} active={selectedBeds === beds} onClick={() => setSelectedBeds(beds)}>
                    {beds}+
                  </Pill>
                ))}
              </div>
            </section>

            {amenityOptions.length > 0 ? (
              <section>
                <p className="mb-3 text-sm font-semibold">Amenities</p>
                <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                  {amenityOptions.map((amenity) => {
                    const checked = selectedAmenities.some((item) => sameAmenity(item, amenity));
                    return (
                      <label key={amenity} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-black/[0.04]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedAmenities((items) => (
                              checked ? items.filter((item) => !sameAmenity(item, amenity)) : [...items, amenity]
                            ));
                          }}
                          className="size-4 rounded border-black/30"
                        />
                        {amenity}
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={applyFilters} className="min-h-10 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]">
              Apply
            </button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
