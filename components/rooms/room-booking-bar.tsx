"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AvailabilityBlock } from "@/lib/availability";
import { getBookedNightKeys, getNextAvailableStay, hasBookedNightInRange } from "@/lib/availability";
import type { Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { TODAY, buildReserveHref, computePrice, useReservationStore } from "@/stores/reservation-store";

const navItems = [
  { label: "About", href: "#overview" },
  { label: "Photos", href: "#gallery" },
  { label: "Amenities", href: "#amenities" },
  { label: "Reviews", href: "#reviews" },
  { label: "Location", href: "#location" },
];

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

export function RoomBookingBar({ property, unavailableStays = [] }: { property: Property; unavailableStays?: AvailabilityBlock[] }) {
  const { checkIn, checkOut, guests } = useReservationStore();
  const [activeSection, setActiveSection] = useState(navItems[0].href);
  const bookedNightKeys = useMemo(() => getBookedNightKeys(unavailableStays), [unavailableStays]);
  const bookedNightSet = useMemo(() => new Set(bookedNightKeys), [bookedNightKeys]);
  const storedStay = computePrice(property.pricePerNight, checkIn, checkOut);
  const effectiveStay = useMemo(() => {
    const selectedStayNeedsRepair =
      checkIn < TODAY ||
      checkOut <= checkIn ||
      bookedNightSet.has(checkIn) ||
      hasBookedNightInRange(checkIn, checkOut, bookedNightSet);

    if (!selectedStayNeedsRepair) return { checkIn, checkOut };

    return getNextAvailableStay({
      fromDate: checkIn,
      minDate: TODAY,
      bookedNightKeys: bookedNightSet,
      preferredNights: Math.max(storedStay.nights, 1),
    }) ?? { checkIn, checkOut };
  }, [bookedNightSet, checkIn, checkOut, storedStay.nights]);
  const { nights, validStay, total } = computePrice(property.pricePerNight, effectiveStay.checkIn, effectiveStay.checkOut);
  const reserveHref = buildReserveHref(property.id, effectiveStay.checkIn, effectiveStay.checkOut, guests);
  const selectedHasUnavailableNight = validStay && hasBookedNightInRange(effectiveStay.checkIn, effectiveStay.checkOut, bookedNightSet);
  const canReserve = validStay && !selectedHasUnavailableNight;

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.href.slice(1));

    function updateActiveSection() {
      const marker = window.innerHeight * 0.42;
      let nextActive = navItems[0].href;

      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (!section) continue;

        const rect = section.getBoundingClientRect();
        if (rect.top <= marker && rect.bottom > marker) {
          nextActive = `#${id}`;
          break;
        }

        if (rect.top <= marker) {
          nextActive = `#${id}`;
        }
      }

      setActiveSection(nextActive);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-[5.5rem] z-40 px-3 sm:px-5 md:bottom-0">
      <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-[#083f35] shadow-[0_-14px_45px_rgb(0_0_0_/_0.16)] ring-1 ring-black/10 sm:px-8 md:rounded-t-2xl md:rounded-b-none">
        <div className="flex items-end gap-2">
          <p className="text-xl font-bold sm:text-2xl md:text-3xl">{formatCurrency(validStay ? total : property.pricePerNight)}</p>
          <p className="hidden pb-1 text-xs font-semibold text-black/55 min-[390px]:block">
            {selectedHasUnavailableNight ? "dates unavailable" : validStay ? `for ${nights} night${nights === 1 ? "" : "s"}` : "/ night"}
          </p>
        </div>

        <div className="hidden flex-1 items-center justify-between gap-8 md:flex">
          <div className="flex items-center gap-7 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-black/45">
            <Meta label="Check-in" value={formatShortDate(checkIn)} />
            <Meta label="Checkout" value={formatShortDate(checkOut)} />
            <Meta label="Guests" value={`${guests} guest${guests === 1 ? "" : "s"}`} />
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#083f35]/70 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                aria-current={activeSection === item.href ? "true" : undefined}
                onClick={() => setActiveSection(item.href)}
                className={`relative py-2 transition after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:rounded-full after:bg-[#083f35] after:transition-transform ${
                  activeSection === item.href
                    ? "font-bold text-[#083f35] after:scale-x-100"
                    : "after:scale-x-0 hover:text-[#083f35] hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <Link
          href={reserveHref}
          aria-disabled={!canReserve}
          tabIndex={canReserve ? undefined : -1}
          className={`flex min-h-11 shrink-0 items-center justify-center rounded-full px-6 text-xs font-bold uppercase tracking-[0.08em] text-white transition sm:min-h-12 sm:px-8 ${
            canReserve ? "bg-[#083f35] hover:bg-[#062f28] active:scale-[0.98]" : "pointer-events-none bg-black/25"
          }`}
        >
          Reserve
        </Link>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <p className="mt-1 text-xs font-semibold normal-case tracking-normal text-black/75">{value}</p>
    </div>
  );
}
