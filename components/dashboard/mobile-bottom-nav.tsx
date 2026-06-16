"use client";

import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  ChartNoAxesCombined,
  Heart,
  Home,
  LayoutDashboard,
  MessageCircle,
  Search,
  Star,
  UserCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";

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
  profile: UserCircle,
  settings: UserCircle,
};

export function MobileBottomNav({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  const visibleLinks = links.slice(0, 5);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {visibleLinks.map((link) => {
          const active = pathname === link.href;
          const Icon = iconByLabel[link.label.toLowerCase() as keyof typeof iconByLabel] ?? Home;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-medium transition active:scale-95 ${
                active ? "bg-[#21170f] text-white" : "text-black/60"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span className="mt-1 truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
