import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function DashboardHeader({
  eyebrow,
  title,
  description,
  showHomeLogo = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  showHomeLogo?: boolean;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-4">
      {showHomeLogo ? (
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <Link
            href="/"
            aria-label="StayPrimePH home"
            className="inline-flex h-11 items-center rounded-full bg-white px-3 shadow-sm ring-1 ring-black/5 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f]/30"
          >
            <BrandLogo className="h-7 w-auto" priority={false} />
          </Link>
          <NotificationBell variant="panel" />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold uppercase tracking-[0.2em] text-black/45 sm:text-sm sm:tracking-[0.24em]">{eyebrow}</p>
          <h1 className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-black/60 sm:text-base">{description}</p>}
        </div>
        <div className={showHomeLogo ? "hidden self-start lg:block" : "self-start"}>
          <NotificationBell variant="panel" />
        </div>
      </div>
    </header>
  );
}
