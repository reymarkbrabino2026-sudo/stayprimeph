"use client";

import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  ChartNoAxesCombined,
  Ellipsis,
  Heart,
  Home,
  LayoutDashboard,
  ListPlus,
  LoaderCircle,
  MessageCircle,
  Search,
  Star,
  UserCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const iconByLabel = {
  dashboard: LayoutDashboard,
  overview: LayoutDashboard,
  erp: ChartNoAxesCombined,
  "host erp": ChartNoAxesCombined,
  home: Home,
  search: Search,
  trips: CalendarCheck2,
  bookings: CalendarCheck2,
  wishlist: Heart,
  messages: MessageCircle,
  notifications: Bell,
  reviews: Star,
  reports: ChartNoAxesCombined,
  profile: UserCircle,
  "host profile": UserCircle,
  "my listings": Home,
  "create listing": ListPlus,
  "calendar availability": CalendarCheck2,
  "booking requests": CalendarCheck2,
  earnings: ChartNoAxesCombined,
  settings: UserCircle,
};

export function MobileBottomNav({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const hasMore = links.length > 5;
  const visibleLinks = hasMore ? links.slice(0, 4) : links.slice(0, 5);
  const moreLinks = hasMore ? links.slice(4) : [];
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const moreActive = moreLinks.some((link) => link.href === activeHref);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 max-w-full overflow-x-hidden border-t bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
      {hasMore && moreOpen ? (
        <div className="absolute inset-x-2 bottom-full mb-2 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_16px_40px_rgba(33,23,15,0.16)]">
          <div className="grid max-h-[45vh] gap-1 overflow-y-auto">
            {moreLinks.map((link) => {
              const active = link.href === activeHref;
              const pending = pendingHref === link.href && !active;
              const Icon = iconByLabel[link.label.toLowerCase() as keyof typeof iconByLabel] ?? Home;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  aria-busy={pending || undefined}
                  onClick={(event) => {
                    if (
                      event.defaultPrevented ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0 ||
                      active
                    ) {
                      return;
                    }

                    setPendingHref(link.href);
                    setMoreOpen(false);
                  }}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.99] ${
                    active
                      ? "bg-[#21170f] text-white"
                      : pending
                        ? "bg-[#fbf7f2] text-[#21170f]"
                        : "text-black/70 hover:bg-[#fbf7f2] hover:text-[#21170f]"
                  }`}
                >
                  {pending ? (
                    <LoaderCircle size={19} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                  )}
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="grid min-w-0 grid-cols-5 gap-1">
        {visibleLinks.map((link) => {
          const active = link.href === activeHref;
          const pending = pendingHref === link.href && !active;
          const Icon = iconByLabel[link.label.toLowerCase() as keyof typeof iconByLabel] ?? Home;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              aria-busy={pending || undefined}
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0 ||
                  active
                ) {
                  return;
                }

                setPendingHref(link.href);
                setMoreOpen(false);
              }}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-medium transition active:scale-95 ${
                active
                  ? "bg-[#21170f] text-white"
                  : pending
                    ? "bg-[#fbf7f2] text-[#21170f]"
                    : "text-black/60"
              }`}
            >
              {pending ? (
                <LoaderCircle size={21} aria-hidden="true" className="animate-spin" />
              ) : (
                <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              )}
              <span className="mt-1 max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
        {hasMore ? (
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label="More dashboard links"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-medium transition active:scale-95 ${
              moreActive || moreOpen ? "bg-[#21170f] text-white" : "text-black/60"
            }`}
          >
            <Ellipsis size={21} strokeWidth={moreActive || moreOpen ? 2.5 : 2} aria-hidden="true" />
            <span className="mt-1 max-w-full truncate">More</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
