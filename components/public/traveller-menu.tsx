"use client";

import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  CircleHelp,
  Globe2,
  Heart,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Rocket,
  Settings,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import type { UserRole } from "@/lib/types";
import { clearStoredHostWizardDraft } from "@/stores/host-wizard-store";

type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
};

const primaryLinks = [
  { label: "Wishlists", href: "/guest/wishlist", icon: Heart },
  { label: "Trips", href: "/guest/bookings", icon: BriefcaseBusiness },
  { label: "Messages", href: "/guest/messages", icon: MessageSquare },
  { label: "Profile", href: "/guest/profile", icon: UserCircle },
];

const hostPrimaryLinks = [
  { label: "Listings", href: "/host/listings", icon: Home },
  { label: "Bookings", href: "/host/bookings", icon: BriefcaseBusiness },
  { label: "Messages", href: "/host/messages", icon: MessageSquare },
  { label: "Profile", href: "/host/profile", icon: UserCircle },
];

const adminPrimaryLinks = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Home },
  { label: "Users", href: "/admin/users", icon: UserCircle },
  { label: "Listings", href: "/admin/listings", icon: BriefcaseBusiness },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const secondaryLinks = [
  { label: "Notifications", href: "/account-settings/notifications", icon: Bell },
  { label: "Account settings", href: "/account-settings", icon: Settings },
  { label: "Languages & currency", href: "/account-settings/languages-and-currency", icon: Globe2 },
  { label: "Help Center", href: "/support/help-center", icon: CircleHelp },
];

const signedInSecondaryLinks = [
  { label: "Account settings", href: "/account-settings", icon: Settings },
  { label: "Languages & currency", href: "/account-settings/languages-and-currency", icon: Globe2 },
  { label: "Help Center", href: "/support/help-center", icon: CircleHelp },
];

function clearClientSessionState() {
  clearStoredHostWizardDraft();
  window.sessionStorage.clear();
}

export function TravellerMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!response.ok) {
          if (active) setSessionLoaded(true);
          return;
        }
        const data = (await response.json()) as { user: SessionUser | null };
        if (active) {
          setUser(data.user);
          setSessionLoaded(true);
        }
      } catch {
        if (active) {
          setUser(null);
          setSessionLoaded(true);
        }
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const isSignedIn = Boolean(user);
  const avatarLabel = user?.avatar || user?.name.charAt(0).toUpperCase() || "U";
  const showHostCta = sessionLoaded && (!user || user.role === "guest");
  const hostCtaHref = user?.role === "guest" ? "/become-a-host/upgrade" : "/register?role=host";
  const activePrimaryLinks = user?.role === "host" ? hostPrimaryLinks : user?.role === "admin" ? adminPrimaryLinks : primaryLinks;
  const activeSecondaryLinks = user?.role === "guest" ? secondaryLinks : signedInSecondaryLinks;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center gap-2 rounded-full px-1 py-1 text-[#083f35] transition"
        aria-label="Open traveller menu"
        aria-expanded={open}
      >
        {isSignedIn ? (
          <span className="grid size-8 place-items-center rounded-full bg-[#e8f4ef] text-sm font-bold text-[#083f35]">
            {avatarLabel}
          </span>
        ) : null}
        <span className="grid size-8 place-items-center rounded-full bg-[#e8f4ef] text-[#083f35]">
          <Menu size={18} />
        </span>
      </button>

      {open ? (
        <>
          <button aria-label="Close traveller menu" onClick={() => setOpen(false)} className="fixed inset-0 z-[590] cursor-default bg-transparent" />
          <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[600] w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-3xl bg-white py-2 text-black shadow-[0_18px_60px_rgb(0_0_0_/_0.18)] ring-1 ring-black/5">
            {isSignedIn ? (
              <>
                <div className="px-2 py-2">
                  {activePrimaryLinks.map(({ label, href, icon: Icon }) => (
                    <Link key={label} href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition hover:bg-black/[0.04]">
                      <Icon size={19} />
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mx-5 border-t" />

                <div className="px-2 py-2">
                  {activeSecondaryLinks.map(({ label, href, icon: Icon }) => (
                    <Link key={label} href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                      <Icon size={18} />
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mx-5 border-t" />
              </>
            ) : (
              <>
                <div className="px-2 py-2">
                  <Link href="/login" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition hover:bg-black/[0.04]">
                    <UserCircle size={19} />
                    Log in
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                    <SlidersHorizontal size={18} />
                    Sign up
                  </Link>
                </div>

                <div className="mx-5 border-t" />
              </>
            )}

            {showHostCta ? (
              <>
                <Link href={hostCtaHref} onClick={() => setOpen(false)} className="mx-2 my-2 flex items-center justify-between rounded-2xl px-4 py-3 transition hover:bg-black/[0.04]">
                  <span>
                    <span className="block text-sm font-semibold">Become a host</span>
                    <span className="mt-1 block max-w-48 text-xs leading-4 text-black/55">It&apos;s easy to start hosting and earn extra income.</span>
                  </span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#e8f4ef] text-[#0f8b6b]">
                    <Rocket size={20} />
                  </span>
                </Link>

                <div className="mx-5 border-t" />
              </>
            ) : null}

            <div className="px-2 py-2">
              {showHostCta ? (
                <Link href={hostCtaHref} onClick={() => setOpen(false)} className="flex min-h-10 items-center rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                  Refer a Host
                </Link>
              ) : null}
              <Link href="/support/help-center" onClick={() => setOpen(false)} className="flex min-h-10 items-center rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                Find a co-host
              </Link>
              {isSignedIn ? (
                <form action={signOut} onSubmit={clearClientSessionState}>
                  <button className="flex min-h-10 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm transition hover:bg-black/[0.04]">
                    <LogOut size={18} />
                    Log out
                  </button>
                </form>
              ) : null}
              {!showHostCta && user?.role === "host" ? (
                <Link href="/host/dashboard" onClick={() => setOpen(false)} className="flex min-h-10 items-center rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                  Host dashboard
                </Link>
              ) : null}
              {isSignedIn ? null : (
                <>
                  <Link href="/account-settings/languages-and-currency" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-3 rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                    <Globe2 size={18} />
                    Languages & currency
                  </Link>
                  <Link href="/support/help-center" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-3 rounded-2xl px-4 text-sm transition hover:bg-black/[0.04]">
                    <CircleHelp size={18} />
                    Help Center
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
