import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  Bell,
  BriefcaseBusiness,
  CircleDollarSign,
  Globe2,
  Hand,
  Landmark,
  Shield,
  UserRound,
  WalletCards,
} from "lucide-react";

const navItems = [
  { label: "Personal information", href: "/account-settings", icon: UserRound },
  { label: "Login & security", href: "/account-settings/login-and-security", icon: Shield },
  { label: "Privacy", href: "/account-settings/privacy", icon: Hand },
  { label: "Notifications", href: "/account-settings/notifications", icon: Bell },
  { label: "Taxes", href: "/account-settings/taxes", icon: Landmark },
  { label: "Payments", href: "/account-settings/payments", icon: WalletCards },
  { label: "Languages & currency", href: "/account-settings/languages-and-currency", icon: Globe2 },
  { label: "Booking permissions", href: "/account-settings/booking-permissions", icon: CircleDollarSign },
  { label: "Travel for work", href: "/account-settings/travel-for-work", icon: BriefcaseBusiness },
];

export function AccountSettingsShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#222]">
      <header className="border-b border-black/10">
        <div className="flex h-24 items-center justify-between px-8 sm:px-12 lg:px-20">
          <Link href="/" className="inline-flex" aria-label="StayPrimePH home">
            <BrandLogo className="h-7 w-auto" />
          </Link>
          <Link href="/guest/profile" className="rounded-full bg-black/[0.06] px-8 py-3 text-sm font-semibold text-black transition hover:bg-black/[0.1]">
            Done
          </Link>
        </div>
      </header>

      <main className="grid lg:grid-cols-[30rem_1fr]">
        <aside className="border-black/10 px-6 py-10 sm:px-10 lg:min-h-[calc(100vh-6rem)] lg:border-r lg:px-16">
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em]">Account settings</h1>
          <nav className="mt-7 max-w-[20.5rem] space-y-3">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className={`flex min-h-14 items-center gap-5 rounded-2xl px-4 font-semibold transition hover:bg-black/[0.04] ${active === label ? "bg-black/[0.06]" : ""}`}
              >
                <Icon size={23} strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-7 max-w-[20.5rem] border-t border-black/10 pt-5">
            <Link
              href="/account-settings/professional-hosting-tools"
              className={`flex min-h-14 items-center gap-5 rounded-2xl px-4 font-semibold transition hover:bg-black/[0.04] ${active === "Professional hosting tools" ? "bg-black/[0.06]" : ""}`}
            >
              <Landmark size={23} strokeWidth={1.8} />
              Professional hosting tools
            </Link>
          </div>
        </aside>

        <section className="px-6 py-10 sm:px-10 lg:px-28">
          <div className="max-w-[44rem]">{children}</div>
        </section>
      </main>
    </div>
  );
}

export function SettingsTabs({ tabs }: { tabs: Array<{ label: string; href: string; active?: boolean }> }) {
  return (
    <div className="mt-8 flex gap-7 border-b border-black/15 text-sm font-semibold">
      {tabs.map((tab) => (
        <Link key={tab.label} href={tab.href} className={`pb-4 ${tab.active ? "border-b-2 border-black text-black" : "text-black/65"}`}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function BlackButton({ children }: { children: React.ReactNode }) {
  return <button className="mt-7 min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white">{children}</button>;
}

export function Toggle({ checked }: { checked?: boolean }) {
  return (
    <span className={`relative inline-flex h-8 w-12 items-center rounded-full ${checked ? "bg-[#222]" : "bg-black/45"}`}>
      <span className={`grid size-7 place-items-center rounded-full bg-white shadow ${checked ? "translate-x-4" : "translate-x-0.5"}`}>
        {checked ? <span className="text-sm leading-none">✓</span> : null}
      </span>
    </span>
  );
}
