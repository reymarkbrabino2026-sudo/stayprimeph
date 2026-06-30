"use client";

import Link from "next/link";
import { ConciergeBell, Home, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PublicBottomNav } from "@/components/public/public-bottom-nav";
import { TravellerMenu } from "@/components/public/traveller-menu";
import type { UserRole } from "@/lib/types";

const MARKETPLACE_NAV = [
  { label: "Homes", href: "/search", icon: Home, badge: "" },
  { label: "Experiences", href: "/hosting/stayprimeph-your-experience", icon: Sparkles, badge: "New" },
  { label: "Services", href: "/hosting/stayprimeph-your-service", icon: ConciergeBell, badge: "New" },
] as const;

type NavbarSessionUser = {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
};

export function Navbar({ transparentOnTop = false, hideBottomNav = false }: { transparentOnTop?: boolean; hideBottomNav?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<{ loaded: boolean; user: NavbarSessionUser | null }>({ loaded: false, user: null });

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
        const data = response.ok ? ((await response.json()) as { user: NavbarSessionUser | null }) : { user: null };
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
  const hostCtaHref = session.user?.role === "guest" ? "/become-a-host/upgrade" : "/register/host";

  return (
    <>
      <header
        className={`top-0 z-[90] flex items-center justify-between border-b px-4 py-4 backdrop-blur transition-all duration-200 sm:px-6 lg:px-12 ${
          transparentOnTop ? "fixed inset-x-0" : "sticky"
        } ${transparent ? "border-transparent bg-transparent text-white" : "border-black/10 bg-white/95 text-black shadow-[0_2px_14px_rgb(0_0_0_/_0.06)]"}`}
      >
        <Link href="/" aria-label="StayPrimePH home" className="flex shrink-0 items-center">
          <BrandLogo variant={transparent ? "white" : "green"} className="h-10 w-auto" priority />
        </Link>
        <nav className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-sm md:flex">
          {MARKETPLACE_NAV.map(({ label, href, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold transition ${transparent ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-black/75 hover:bg-black/[0.04] hover:text-black"}`}
            >
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
              {badge ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${transparent ? "bg-white/20 text-white" : "bg-[#e8f4ef] text-[#083f35]"}`}>{badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {showHostCta ? (
            <Link href={hostCtaHref} className={`hidden rounded-full px-3 py-2 text-sm font-medium transition sm:inline ${transparent ? "hover:bg-white/15" : "hover:bg-black/[0.04]"}`}>
              Become a host
            </Link>
          ) : null}
          {session.user ? <NotificationBell variant={transparent ? "light" : "dark"} eager={false} /> : null}
          <TravellerMenu sessionUser={session.user} sessionLoaded={session.loaded} />
        </div>
      </header>
      {hideBottomNav ? null : <PublicBottomNav />}
    </>
  );
}
