"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Home, Search } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SearchBar } from "@/components/public/search-bar";
import { TravellerMenu } from "@/components/public/traveller-menu";
import { SearchFilters } from "@/components/search/search-filters";
import type { UserRole } from "@/lib/types";

type TypeOption = { value: string; label: string };
type HeaderSessionUser = { id: string; name: string; role: UserRole; avatar: string };

type SearchPageHeaderProps = {
  summary: {
    location: string;
    dates: string;
    guests: string;
  };
  filters: {
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
};

export function SearchPageHeader({ summary, filters }: SearchPageHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<{ loaded: boolean; user: HeaderSessionUser | null }>({ loaded: false, user: null });

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const data = response.ok ? ((await response.json()) as { user: HeaderSessionUser | null }) : { user: null };
        if (active) setSession({ loaded: true, user: data.user });
      } catch {
        if (active) setSession({ loaded: true, user: null });
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (headerRef.current?.contains(target) || searchPanelRef.current?.contains(target)) return;
      setExpanded(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  const showHostCta = session.loaded && (!session.user || session.user.role === "guest");
  const hostCtaHref = session.user?.role === "guest" ? "/become-a-host/upgrade" : "/register/host";
  const collapseWhenSearchPanelCloses = useCallback((panel: "where" | "when" | "who" | null) => {
    if (!panel) setExpanded(false);
  }, []);

  return (
    <header className="relative z-[95] hidden shrink-0 border-b border-black/10 bg-white text-black shadow-[0_2px_14px_rgb(0_0_0_/_0.06)] lg:block">
      <div ref={headerRef} className="relative flex h-20 items-center justify-between px-12">
        <Link href="/" aria-label="StayPrimePH home" className="flex shrink-0 items-center">
          <BrandLogo variant="green" className="h-10 w-auto" priority />
        </Link>

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="search-page-expanded-search"
            className="flex h-12 w-[min(34rem,48vw)] min-w-[28rem] items-center rounded-full border border-black/10 bg-white pl-3 pr-2 text-sm font-semibold shadow-[0_4px_18px_rgb(0_0_0_/_0.12)] transition hover:shadow-[0_6px_22px_rgb(0_0_0_/_0.16)]"
          >
            <span className="mr-3 grid size-8 shrink-0 place-items-center rounded-lg border border-black/10 bg-[#f7f7f7] text-[#083f35]">
              <Home size={17} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1 truncate text-left">{summary.location}</span>
            <span className="mx-4 h-6 w-px shrink-0 bg-black/10" />
            <span className="shrink-0">{summary.dates}</span>
            <span className="mx-4 h-6 w-px shrink-0 bg-black/10" />
            <span className="min-w-[5.75rem] shrink-0 text-left">{summary.guests}</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
              <Search size={16} strokeWidth={3} />
            </span>
          </button>

          <SearchFilters compact types={filters.types} amenities={filters.amenities} current={filters.current} />
        </div>

        <div className="flex items-center gap-3">
          {showHostCta ? (
            <Link href={hostCtaHref} className="hidden rounded-full px-3 py-2 text-sm font-medium transition hover:bg-black/[0.04] sm:inline">
              Become a host
            </Link>
          ) : null}
          {session.user ? <NotificationBell variant="dark" eager={false} /> : null}
          <TravellerMenu sessionUser={session.user} sessionLoaded={session.loaded} />
        </div>
      </div>

      {expanded ? (
        <div
          id="search-page-expanded-search"
          ref={searchPanelRef}
          className="absolute inset-x-0 top-full z-[105] border-b border-black/10 bg-white px-6 pb-6 pt-5 shadow-[0_18px_45px_rgb(0_0_0_/_0.14)]"
        >
          <div className="mx-auto max-w-4xl">
            <SearchBar variant="desktop" defaultPanel="where" onPanelChange={collapseWhenSearchPanelCloses} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
