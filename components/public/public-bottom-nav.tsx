"use client";

import Link from "next/link";
import { CalendarCheck2, Heart, Home, Search, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Trips", href: "/guest/bookings", icon: CalendarCheck2 },
  { label: "Wishlist", href: "/guest/wishlist", icon: Heart },
  { label: "Profile", href: "/login", icon: UserCircle },
];

export function PublicBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-2 pt-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[11px] transition active:scale-95 ${active ? "text-[#083f35]" : "text-black/55"}`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
