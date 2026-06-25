"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, Search, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { recentSearchStorageKey, type RecentSearchPayload } from "@/lib/recent-search";

const recentSearchChangedEvent = "stayprimeph:recent-search-changed";

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLocation(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "Anywhere";
  return trimmed.replace(/,\s*Philippines$/i, "");
}

function isRecentSearch(value: unknown): value is RecentSearchPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RecentSearchPayload>;
  return typeof candidate.href === "string" && candidate.href.startsWith("/search") && typeof candidate.savedAt === "number";
}

function getRecentSearchSnapshot() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(recentSearchStorageKey) ?? "";
  } catch {
    return "";
  }
}

function subscribeRecentSearch(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(recentSearchChangedEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(recentSearchChangedEvent, callback);
  };
}

function parseRecentSearch(snapshot: string) {
  if (!snapshot) return null;
  try {
    const parsed = JSON.parse(snapshot);
    return isRecentSearch(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function RecentSearchCard() {
  const snapshot = useSyncExternalStore(subscribeRecentSearch, getRecentSearchSnapshot, () => "");
  const recentSearch = useMemo(() => parseRecentSearch(snapshot), [snapshot]);

  function dismissRecentSearch() {
    try {
      window.localStorage.removeItem(recentSearchStorageKey);
      window.dispatchEvent(new Event(recentSearchChangedEvent));
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  }

  const details = useMemo(() => {
    if (!recentSearch) return "";
    const checkIn = formatDate(recentSearch.checkIn);
    const checkOut = formatDate(recentSearch.checkOut);
    const dates = checkIn && checkOut ? `${checkIn} - ${checkOut}` : checkIn || "Any week";
    const guests = recentSearch.guests ? `${recentSearch.guests} guest${recentSearch.guests === 1 ? "" : "s"}` : "";
    return [dates, guests].filter(Boolean).join(" | ");
  }, [recentSearch]);

  if (!recentSearch) return null;

  const location = formatLocation(recentSearch.location);

  return (
    <section className="rounded-2xl border border-black/10 bg-[#f8fbf9] p-4 shadow-[0_8px_28px_rgb(0_0_0_/_0.05)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
            <Clock3 size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-black/55">Pick up your search</p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-normal text-[#083f35]">
              Continue looking in {location}
            </h2>
            {details ? <p className="mt-1 text-sm text-black/60">{details}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={recentSearch.href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]"
          >
            <Search size={16} strokeWidth={2.5} />
            Continue
            <ArrowUpRight size={15} strokeWidth={2.4} />
          </Link>
          <button
            type="button"
            aria-label="Dismiss recent search"
            onClick={dismissRecentSearch}
            className="grid size-11 place-items-center rounded-full border border-black/10 bg-white text-black/65 transition hover:border-black/20 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
