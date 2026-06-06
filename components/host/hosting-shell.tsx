import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Menu } from "lucide-react";

import { TravellerMenu } from "@/components/public/traveller-menu";

const tabs = [
  { label: "Today", href: "/host/dashboard" },
  { label: "Calendar", href: "/host/calendar" },
  { label: "Listings", href: "/host/listings" },
  { label: "Messages", href: "/host/messages" },
];

export function HostingShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#222]">
      <header className="border-b border-black/10 bg-white">
        <div className="grid h-24 grid-cols-[minmax(0,1fr)_auto] items-center px-6 sm:px-10 md:grid-cols-[1fr_auto_1fr] lg:px-12">
          <Link href="/" className="flex items-center" aria-label="StayPrimePH home">
            <BrandLogo className="h-7 w-auto" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {tabs.map((tab) => (
              <Link key={tab.label} href={tab.href} className={`py-9 text-sm font-semibold ${active === tab.label ? "border-b-2 border-black text-black" : "text-black/65"}`}>
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-5 justify-self-end">
            <Link href="/" className="hidden text-sm font-semibold sm:inline">Switch to traveling</Link>
            <TravellerMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function HostRoundButton({ children, label }: { children: React.ReactNode; label: string }) {
  return <button aria-label={label} className="grid size-10 place-items-center rounded-full bg-black/[0.04] transition hover:bg-black/[0.08]">{children}</button>;
}

export { Menu };
