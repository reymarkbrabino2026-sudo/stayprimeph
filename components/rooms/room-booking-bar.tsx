"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UnavailableStay } from "@/lib/availability-calendar";
import { getBookedNightKeys, getNextAvailableStay, hasBookedNightInRange } from "@/lib/availability-calendar";
import { bookingBlocksRequestedPackage } from "@/lib/booking-conflicts";
import { calculateGuestPriceWithMarkup, findBookingPackageById } from "@/lib/pricing";
import type { Property } from "@/lib/types";
import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME, formatCurrency } from "@/lib/utils";
import { normalizeVirtualTourUrl } from "@/lib/virtual-tour";
import { TODAY, buildReserveHref, computePrice, useReservationStore } from "@/stores/reservation-store";

const baseNavItems = [
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

export function RoomBookingBar({ property, unavailableStays = [] }: { property: Property; unavailableStays?: UnavailableStay[] }) {
  const { checkIn, checkOut, guests, packageId } = useReservationStore();
  const barRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(baseNavItems[0].href);
  const [stopPosition, setStopPosition] = useState<{ stopped: boolean; top: number } | null>(null);
  const [inlineReservationVisible, setInlineReservationVisible] = useState(false);
  const navItems = useMemo(() => {
    if (!normalizeVirtualTourUrl(property.virtualTourUrl)) return baseNavItems;
    return [
      baseNavItems[0],
      baseNavItems[1],
      { label: "Tour", href: "#virtual-tour" },
      ...baseNavItems.slice(2),
    ];
  }, [property.virtualTourUrl]);
  const selectedPackage = useMemo(() => (packageId ? findBookingPackageById(property, packageId) : null), [packageId, property]);
  const relevantUnavailableStays = useMemo(
    () => unavailableStays.filter((stay) => "date" in stay || bookingBlocksRequestedPackage(stay, selectedPackage?.id, property.bookingPackages ?? [])),
    [property.bookingPackages, selectedPackage?.id, unavailableStays],
  );
  const bookedNightKeys = useMemo(() => getBookedNightKeys(relevantUnavailableStays), [relevantUnavailableStays]);
  const bookedNightSet = useMemo(() => new Set(bookedNightKeys), [bookedNightKeys]);
  const effectiveStay = useMemo(() => {
    const selectedStayNeedsRepair =
      checkIn < TODAY ||
      checkOut <= checkIn ||
      bookedNightSet.has(checkIn) ||
      hasBookedNightInRange(checkIn, checkOut, bookedNightSet);

    if (!selectedStayNeedsRepair) return { checkIn, checkOut };

    return getNextAvailableStay({
      fromDate: checkIn || TODAY,
      minDate: TODAY,
      bookedNightKeys: bookedNightSet,
      preferredNights: 1,
    }) ?? { checkIn, checkOut };
  }, [bookedNightSet, checkIn, checkOut]);
  const { nights, validStay, total } = computePrice(property, effectiveStay.checkIn, effectiveStay.checkOut, guests, selectedPackage?.id);
  const guestNightlyPrice = calculateGuestPriceWithMarkup(selectedPackage?.weekdayRate ?? property.pricePerNight);
  const reserveHref = validStay ? buildReserveHref(property.id, effectiveStay.checkIn, effectiveStay.checkOut, guests, selectedPackage?.id) : "#";
  const selectedHasUnavailableNight = validStay && hasBookedNightInRange(effectiveStay.checkIn, effectiveStay.checkOut, bookedNightSet);
  const selectedStartsUnavailable = Boolean(effectiveStay.checkIn) && (effectiveStay.checkIn < TODAY || bookedNightSet.has(effectiveStay.checkIn));
  const canReserve = validStay && !selectedStartsUnavailable && !selectedHasUnavailableNight;

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
  }, [navItems]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const pageFooter = footer;

    let frame = 0;

    function updateStopPosition() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bar = barRef.current;
        if (!bar) return;

        const mobileOffset = 0;
        const footerRect = pageFooter.getBoundingClientRect();
        const barHeight = bar.getBoundingClientRect().height;
        const fixedBarBottom = window.innerHeight - mobileOffset;
        const footerDocumentTop = window.scrollY + footerRect.top;

        setStopPosition({
          stopped: footerRect.top <= fixedBarBottom,
          top: footerDocumentTop - barHeight,
        });
      });
    }

    updateStopPosition();
    window.addEventListener("scroll", updateStopPosition, { passive: true });
    window.addEventListener("resize", updateStopPosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateStopPosition);
      window.removeEventListener("resize", updateStopPosition);
    };
  }, []);

  useEffect(() => {
    const inlineReservation = document.getElementById("mobile-reservation-card");
    if (!inlineReservation || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInlineReservationVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -20% 0px", threshold: 0.12 },
    );
    observer.observe(inlineReservation);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      className={`inset-x-0 z-50 px-0 transition duration-200 md:px-5 ${
        stopPosition?.stopped ? "absolute" : "fixed bottom-0"
      } ${inlineReservationVisible ? "pointer-events-none translate-y-full opacity-0 lg:pointer-events-auto lg:translate-y-0 lg:opacity-100" : ""}`}
      style={stopPosition?.stopped ? { top: `${stopPosition.top}px` } : undefined}
    >
      <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3 rounded-t-[1.35rem] border-t border-black/10 bg-white px-4 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-3 text-[#083f35] shadow-[0_-14px_45px_rgb(0_0_0_/_0.16)] sm:px-5 md:rounded-t-2xl md:rounded-b-none md:px-8 md:py-3 md:ring-1 md:ring-black/10">
        <div className="min-w-0 flex-1 md:w-[15rem] md:flex-none lg:w-[18rem]">
          <p className="truncate text-xl font-bold sm:text-2xl md:text-3xl">{formatCurrency(validStay ? total : guestNightlyPrice)}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-black/55 min-[390px]:text-xs md:pb-1">
            {selectedHasUnavailableNight ? "dates unavailable" : validStay ? `for ${nights} ${selectedPackage?.unit === "day" ? "day" : "night"}${nights === 1 ? "" : "s"}` : `/${selectedPackage?.unit === "day" ? "day" : "night"}`}
          </p>
        </div>

        <div className="hidden flex-1 items-center justify-between gap-8 md:flex">
          <div className="flex items-center gap-7 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-black/45">
            <Meta label="Check-in" value={effectiveStay.checkIn ? formatShortDate(effectiveStay.checkIn) : "Add date"} time={selectedPackage?.checkInTime ?? STANDARD_CHECK_IN_TIME} />
            <Meta label="Check-out" value={effectiveStay.checkOut ? formatShortDate(effectiveStay.checkOut) : "Add date"} time={selectedPackage?.checkOutTime ?? STANDARD_CHECK_OUT_TIME} />
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
          className={`flex min-h-12 shrink-0 items-center justify-center rounded-full px-6 text-xs font-bold uppercase tracking-[0.08em] text-white transition sm:px-8 ${
            canReserve ? "bg-[#083f35] hover:bg-[#062f28] active:scale-[0.98]" : "pointer-events-none bg-black/25"
          }`}
        >
          Reserve
        </Link>
      </div>
    </div>
  );
}

function Meta({ label, value, time }: { label: string; value: string; time?: string }) {
  return (
    <div>
      <p>{label}</p>
      <p className="mt-1 text-xs font-semibold normal-case tracking-normal text-black/75">{value}</p>
      {time ? <p className="mt-0.5 text-[0.68rem] font-semibold normal-case tracking-normal text-black/45">{time}</p> : null}
    </div>
  );
}
