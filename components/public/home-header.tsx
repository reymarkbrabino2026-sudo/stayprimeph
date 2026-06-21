"use client";

import { Home, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PublicBottomNav } from "@/components/public/public-bottom-nav";
import { SearchBar } from "@/components/public/search-bar";
import { TravellerMenu } from "@/components/public/traveller-menu";

const POPULAR_CITIES = ["Baguio", "Tagaytay", "Cebu", "Boracay", "Davao", "Siargao"];

export function HomeHeader() {
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState<{ loaded: boolean; user: { role: string } | null }>({ loaded: false, user: null });

  useEffect(() => {
    let frame = 0;

    function updateHeader() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setCollapsed(window.scrollY > 8);
      });
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    document.addEventListener("scroll", updateHeader, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateHeader);
      document.removeEventListener("scroll", updateHeader);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const data = response.ok ? ((await response.json()) as { user: { role: string } | null }) : { user: null };
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

  const showHostCta = session.loaded && (!session.user || session.user.role === "guest");
  const hostCtaHref = session.user?.role === "guest" ? "/become-a-host/upgrade" : "/register?role=host";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-200 ease-out ${
          collapsed
            ? "border-black/10 bg-white/95 text-black shadow-[0_2px_14px_rgb(0_0_0_/_0.08)] backdrop-blur"
            : "border-transparent bg-transparent text-white"
        }`}
      >
        <div className="relative flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-12">
          <Link href="/" aria-label="StayPrimePH home" className="flex shrink-0 items-center">
            <BrandLogo variant={collapsed ? "green" : "white"} className="h-10 w-auto" priority />
          </Link>

          <nav className={`absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm transition-all duration-150 ease-out md:flex ${collapsed ? "pointer-events-none -translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}>
            <Link href="/search" className="flex items-center gap-2 py-2 font-semibold">
              <Home size={24} strokeWidth={1.8} />
              Stays
            </Link>
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city}
                href={`/search?location=${encodeURIComponent(city)}`}
                className="py-2 font-semibold text-current/85 transition hover:text-current"
              >
                {city}
              </Link>
            ))}
          </nav>

          <Link
            href="/search"
            className={`absolute left-1/2 hidden h-12 w-[min(23rem,42vw)] -translate-x-1/2 items-center justify-between rounded-full border bg-white pl-5 pr-2 text-sm font-semibold shadow-[0_2px_10px_rgb(0_0_0_/_0.12)] transition-all duration-150 ease-out md:flex ${
              collapsed ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"
            }`}
          >
            <span className="truncate">Anywhere</span>
            <span className="h-6 w-px bg-black/10" />
            <span className="truncate">Any week</span>
            <span className="h-6 w-px bg-black/10" />
            <span className="truncate text-black/55">Add guests</span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
              <Search size={15} strokeWidth={3} />
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {showHostCta ? (
              <Link href={hostCtaHref} className={`hidden rounded-full px-3 py-2 text-sm font-medium transition sm:inline ${collapsed ? "hover:bg-black/[0.04]" : "hover:bg-white/15"}`}>
                Become a host
              </Link>
            ) : null}
            {session.user ? <NotificationBell variant={collapsed ? "dark" : "light"} /> : null}
            <TravellerMenu />
          </div>
        </div>

        <div className={`hidden px-4 transition-all duration-150 ease-out sm:px-6 md:block ${collapsed ? "pointer-events-none h-0 overflow-hidden opacity-0" : "h-[95px] overflow-visible opacity-100"}`}>
          <div className={`mx-auto max-w-4xl origin-top transition-transform duration-150 ease-out ${collapsed ? "-translate-y-4 scale-95" : "translate-y-0 scale-100"}`}>
            <SearchBar />
          </div>
        </div>

        <Link
          href="/search"
          className={`mx-4 flex items-center gap-3 rounded-full border bg-white px-4 text-sm text-black shadow-[0_2px_12px_rgb(0_0_0_/_0.10)] transition-all duration-200 ease-out md:hidden ${
            collapsed
              ? "pointer-events-none mb-0 max-h-0 min-h-0 -translate-y-2 overflow-hidden border-transparent opacity-0 shadow-none"
              : "mb-3 max-h-16 min-h-14 translate-y-1 opacity-100"
          }`}
        >
          <span className="grid size-9 place-items-center rounded-full bg-[#083f35] text-white">
            <Search size={16} strokeWidth={3} />
          </span>
          <span>
            <span className="block font-semibold">Start your search</span>
            <span className="block text-xs text-black/55">Anywhere / Any week / Add guests</span>
          </span>
        </Link>
      </header>
      <PublicBottomNav />
    </>
  );
}
