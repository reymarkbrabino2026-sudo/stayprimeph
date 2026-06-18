"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

export function DashboardSidebar({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="hidden border-r bg-white p-6 lg:block">
      <Link href="/" aria-label="StayPrimePH home" className="inline-flex">
        <BrandLogo className="h-7 w-auto" />
      </Link>
      <nav className="mt-10 space-y-2">
        {links.map((link) => {
          const active = link.href === activeHref;
          const pending = pendingHref === link.href && !active;

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
              }}
              className={cn(
                "flex min-h-12 items-center justify-between gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 ease-out",
                "focus-visible:ring-2 focus-visible:ring-[#21170f]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                active
                  ? "bg-[#21170f] text-white shadow-sm"
                  : "text-black/65 hover:translate-x-1 hover:bg-[#fbf7f2] hover:text-[#21170f] hover:shadow-[0_8px_24px_rgba(33,23,15,0.08)] active:translate-x-0 active:scale-[0.99]",
                pending && "translate-x-1 bg-[#fbf7f2] text-[#21170f] shadow-[0_8px_24px_rgba(33,23,15,0.08)]",
              )}
            >
              <span className="truncate">{link.label}</span>
              {pending ? <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" /> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
