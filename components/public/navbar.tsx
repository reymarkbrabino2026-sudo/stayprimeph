"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PublicBottomNav } from "@/components/public/public-bottom-nav";
import { TravellerMenu } from "@/components/public/traveller-menu";

const POPULAR_CITIES = ["Baguio", "Tagaytay", "Cebu", "Boracay"];

export function Navbar({ transparentOnTop = false, hideBottomNav = false }: { transparentOnTop?: boolean; hideBottomNav?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<{ loaded: boolean; user: { role: string } | null }>({ loaded: false, user: null });

  useEffect(() => {
    if (!transparentOnTop) {
      return;
    }

    let frame = 0;

    function updateHeader() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12);
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
  }, [transparentOnTop]);

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

  const transparent = transparentOnTop && !scrolled;
  const showHostCta = session.loaded && (!session.user || session.user.role === "guest");
  const hostCtaHref = session.user?.role === "guest" ? "/become-a-host/upgrade" : "/register?role=host";

  return (
    <>
      <header
        className={`top-0 z-[90] flex items-center justify-between border-b px-4 py-4 backdrop-blur transition-all duration-200 sm:px-6 lg:px-12 ${
          transparentOnTop ? "fixed inset-x-0" : "sticky"
        } ${transparent ? "border-transparent bg-transparent text-white" : "border-black/10 bg-white/95 text-black shadow-[0_2px_14px_rgb(0_0_0_/_0.06)]"}`}
      >
        <Link href="/" aria-label="StayPrimePH home" className="flex shrink-0 items-center">
          <BrandLogo variant={transparent ? "white" : "green"} className="h-7 w-auto" priority />
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm md:flex">
          <Link href="/search" className="flex items-center gap-2 border-b-2 border-current pb-3 font-semibold">
            <Home size={16} /> Stays
          </Link>
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/search?location=${encodeURIComponent(city)}`}
              className="pb-3 font-semibold text-current/75 transition hover:text-current"
            >
              {city}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {showHostCta ? (
            <Link href={hostCtaHref} className={`hidden rounded-full px-3 py-2 text-sm font-medium transition sm:inline ${transparent ? "hover:bg-white/15" : "hover:bg-black/[0.04]"}`}>
              Become a host
            </Link>
          ) : null}
          {session.user ? <NotificationBell variant={transparent ? "light" : "dark"} /> : null}
          <TravellerMenu />
        </div>
      </header>
      {hideBottomNav ? null : <PublicBottomNav />}
    </>
  );
}
