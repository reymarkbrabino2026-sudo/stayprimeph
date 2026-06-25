"use client";

import { ConciergeBell, Globe2, Home, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PublicBottomNav } from "@/components/public/public-bottom-nav";
import { SearchBar } from "@/components/public/search-bar";
import { TravellerMenu } from "@/components/public/traveller-menu";

const MARKETPLACE_NAV = [
  { label: "Homes", href: "/search", icon: Home, badge: "" },
  { label: "Experiences", href: "/hosting/stayprimeph-your-experience", icon: Sparkles, badge: "New" },
  { label: "Services", href: "/hosting/stayprimeph-your-service", icon: ConciergeBell, badge: "New" },
] as const;

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
        className={`fixed inset-x-0 top-0 z-50 border-b bg-white text-black shadow-[0_2px_16px_rgb(0_0_0_/_0.08)] transition-all duration-200 ease-out ${
          collapsed
            ? "border-black/10 md:bg-white/95 md:text-black md:shadow-[0_2px_14px_rgb(0_0_0_/_0.08)] md:backdrop-blur"
            : "border-black/10 md:border-transparent md:bg-transparent md:text-white md:shadow-none"
        }`}
      >
        <div className="flex h-[72px] items-center justify-between gap-3 px-4 md:hidden">
          <Link href="/" aria-label="StayPrimePH home" className="flex min-w-0 shrink items-center">
            <BrandLogo variant="green" className="h-8 w-auto" priority />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {showHostCta ? (
              <Link
                href={hostCtaHref}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#083f35]/15 px-3.5 text-sm font-semibold text-[#083f35] transition active:scale-95"
              >
                Become a host
              </Link>
            ) : null}
            {session.user ? <NotificationBell variant="dark" eager={false} /> : null}
            <TravellerMenu />
          </div>
        </div>

        <div className="px-4 pb-4 md:hidden">
          <SearchBar variant="mobile" />
        </div>

        <div className="relative hidden h-[72px] items-center justify-between px-4 sm:px-6 md:flex lg:px-12">
          <Link href="/" aria-label="StayPrimePH home" className="flex shrink-0 items-center">
            <BrandLogo variant={collapsed ? "green" : "white"} className="h-10 w-auto" priority />
          </Link>

          <nav className={`absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-sm transition-all duration-150 ease-out md:flex ${collapsed ? "pointer-events-none -translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}>
            {MARKETPLACE_NAV.map(({ label, href, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-current/90 transition hover:bg-white/15 hover:text-current"
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{label}</span>
                {badge ? <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">{badge}</span> : null}
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
            <Link
              href="/account-settings/languages-and-currency"
              aria-label="Languages and currency"
              className={`hidden size-10 place-items-center rounded-full transition md:grid ${collapsed ? "text-black hover:bg-black/[0.04]" : "text-white hover:bg-white/15"}`}
            >
              <Globe2 size={18} strokeWidth={2.1} />
            </Link>
            {session.user ? <NotificationBell variant={collapsed ? "dark" : "light"} eager={false} /> : null}
            <TravellerMenu />
          </div>
        </div>

        <div className={`hidden px-4 transition-all duration-150 ease-out sm:px-6 md:block ${collapsed ? "pointer-events-none h-0 overflow-hidden opacity-0" : "h-[95px] overflow-visible opacity-100"}`}>
          <div className={`mx-auto max-w-4xl origin-top transition-transform duration-150 ease-out ${collapsed ? "-translate-y-4 scale-95" : "translate-y-0 scale-100"}`}>
            <SearchBar variant="desktop" />
          </div>
        </div>
      </header>
      <PublicBottomNav />
    </>
  );
}
