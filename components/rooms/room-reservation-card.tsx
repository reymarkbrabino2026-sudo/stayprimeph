"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Minus, Plus, ShieldCheck, Star, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { UnavailableStay } from "@/lib/availability-calendar";
import { addDays, getBookedNightKeys, getNextAvailableStay, hasBookedNightInRange, parseDateKey } from "@/lib/availability-calendar";
import { bookingBlocksRequestedPackage } from "@/lib/booking-conflicts";
import { allowsPackageBooking, allowsStayBooking, calculateDefaultWeekendPrice, calculateGuestPriceWithMarkup, findBookingPackageById, getEnabledBookingPackages, getFullAccessBookingPackage } from "@/lib/pricing";
import type { Property } from "@/lib/types";
import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME, formatCurrency } from "@/lib/utils";
import {
  TODAY,
  buildReserveHref,
  computePrice,
  useReservationStore,
} from "@/stores/reservation-store";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const desktopStickyTopPx = 112;
const desktopStickyBottomPx = 96;

type StickyMode = "inline" | "fixed" | "absolute";
type StickyMetrics = {
  mode: StickyMode;
  top: number;
  left: number;
  width: number;
  height: number;
};

function sameStickyMetrics(current: StickyMetrics, next: StickyMetrics) {
  return (
    current.mode === next.mode &&
    current.top === next.top &&
    current.left === next.left &&
    current.width === next.width &&
    current.height === next.height
  );
}

export function RoomStickyReservationCard({
  property,
  rating,
  unavailableStays = [],
}: {
  property: Property;
  rating: string;
  unavailableStays?: UnavailableStay[];
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<StickyMetrics>({ mode: "inline", top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    let frame = 0;

    function updatePosition() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const shell = shellRef.current;
        const card = cardRef.current;
        if (!shell || !card) return;

        const shellRect = shell.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const boundary = shell.closest("[data-reservation-sticky-boundary]") as HTMLElement | null;
        const boundaryRect = boundary?.getBoundingClientRect();
        const boundaryBottom = boundaryRect ? window.scrollY + boundaryRect.bottom : Number.POSITIVE_INFINITY;
        const shellTop = window.scrollY + shellRect.top;
        const nextHeight = cardRect.height;
        const stickyTop = window.scrollY + desktopStickyTopPx;
        const stopTop = Math.max(shellTop, boundaryBottom - desktopStickyBottomPx - nextHeight);
        const mode: StickyMode =
          stickyTop <= shellTop
            ? "inline"
            : stickyTop >= stopTop
              ? "absolute"
              : "fixed";

        const nextMetrics = {
          mode,
          top: mode === "absolute" ? Math.max(0, stopTop - shellTop) : desktopStickyTopPx,
          left: shellRect.left,
          width: shellRect.width,
          height: nextHeight,
        };

        setMetrics((current) => (sameStickyMetrics(current, nextMetrics) ? current : nextMetrics));
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  const fixedStyle: CSSProperties =
    metrics.mode === "fixed"
      ? {
          left: metrics.left,
          maxHeight: `calc(100svh - ${desktopStickyTopPx + desktopStickyBottomPx}px)`,
          overflowY: "auto",
          top: desktopStickyTopPx,
          width: metrics.width,
        }
      : {};
  const absoluteStyle: CSSProperties =
    metrics.mode === "absolute"
      ? {
          maxHeight: `calc(100svh - ${desktopStickyTopPx + desktopStickyBottomPx}px)`,
          overflowY: "auto",
          top: metrics.top,
          width: metrics.width,
        }
      : {};

  return (
    <aside
      ref={shellRef}
      className="relative hidden lg:block lg:self-start"
      style={metrics.mode === "inline" ? undefined : { minHeight: metrics.height }}
    >
      <div
        ref={cardRef}
        className={`${metrics.mode === "fixed" ? "fixed z-40" : metrics.mode === "absolute" ? "absolute z-40" : ""}`}
        style={metrics.mode === "fixed" ? fixedStyle : metrics.mode === "absolute" ? absoluteStyle : undefined}
      >
        <RoomReservationCard property={property} rating={rating} unavailableStays={unavailableStays} />
      </div>
    </aside>
  );
}

export function RoomReservationCard({
  property,
  rating,
  unavailableStays = [],
}: {
  property: Property;
  rating: string;
  unavailableStays?: UnavailableStay[];
}) {
  const checkIn = useReservationStore((state) => state.checkIn);
  const checkOut = useReservationStore((state) => state.checkOut);
  const guests = useReservationStore((state) => state.guests);
  const bookingMode = useReservationStore((state) => state.bookingMode);
  const packageId = useReservationStore((state) => state.packageId);
  const setCheckIn = useReservationStore((state) => state.setCheckIn);
  const setCheckOut = useReservationStore((state) => state.setCheckOut);
  const setGuests = useReservationStore((state) => state.setGuests);
  const setBookingMode = useReservationStore((state) => state.setBookingMode);
  const setPackageId = useReservationStore((state) => state.setPackageId);
  const instantBook = property.rules.includes("Instant book enabled");
  const bookingPackages = useMemo(() => getEnabledBookingPackages(property), [property]);
  const stayBookingAllowed = allowsStayBooking(property);
  const packageBookingAllowed = allowsPackageBooking(property);
  const effectiveBookingMode = packageBookingAllowed && !stayBookingAllowed ? "package" : stayBookingAllowed && !packageBookingAllowed ? "stay" : bookingMode;
  const selectedPackage = useMemo(() => (packageBookingAllowed ? findBookingPackageById(property, packageId) : null), [packageBookingAllowed, packageId, property]);
  const displayedPackage = effectiveBookingMode === "package" ? selectedPackage ?? bookingPackages[0] ?? null : null;
  const fullAccessPackage = useMemo(() => getFullAccessBookingPackage(bookingPackages), [bookingPackages]);
  const selectedIsDayPackage = effectiveBookingMode === "package" && displayedPackage?.unit === "day";
  const dayCheckout = checkIn ? addDays(checkIn, 1) : "";
  const activePackage = effectiveBookingMode === "package"
    ? selectedIsDayPackage && fullAccessPackage && checkOut > dayCheckout ? fullAccessPackage : displayedPackage
    : null;
  const activeIsDayPackage = activePackage?.unit === "day";
  const relevantUnavailableStays = useMemo(
    () => unavailableStays.filter((stay) => "date" in stay || bookingBlocksRequestedPackage(stay, activePackage?.id, bookingPackages)),
    [activePackage?.id, bookingPackages, unavailableStays],
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
  const { nights, weekdayNights, weekendNights, validStay, total } = computePrice(property, effectiveStay.checkIn, effectiveStay.checkOut, guests, activePackage?.id);
  const packageWeekdayRate = activePackage?.weekdayRate ?? property.pricePerNight;
  const packageWeekendRate = activePackage ? (activePackage.weekendRate > 0 ? activePackage.weekendRate : activePackage.weekdayRate) : property.weekendPrice ?? calculateDefaultWeekendPrice(property.pricePerNight);
  const guestNightlyPrice = calculateGuestPriceWithMarkup(packageWeekdayRate);
  const guestWeekendPrice = calculateGuestPriceWithMarkup(packageWeekendRate);
  const headlinePrice = validStay ? total : guestNightlyPrice;
  const unitName = activePackage?.unit === "day" ? "day" : "night";
  const headlinePriceLabel = validStay ? ` for ${nights} ${unitName}${nights === 1 ? "" : "s"}` : ` / ${unitName}`;
  const rateSummary = formatRateSummary({ guestNightlyPrice, guestWeekendPrice, weekdayNights, weekendNights, nights, unitName });
  const selectedHasUnavailableNight = validStay && hasBookedNightInRange(effectiveStay.checkIn, effectiveStay.checkOut, bookedNightSet);
  const selectedStartsUnavailable = Boolean(effectiveStay.checkIn) && (effectiveStay.checkIn < TODAY || bookedNightSet.has(effectiveStay.checkIn));
  const canReserve = validStay && !selectedStartsUnavailable && !selectedHasUnavailableNight;
  const reserveHref = canReserve ? buildReserveHref(property.id, effectiveStay.checkIn, effectiveStay.checkOut, guests, activePackage?.id) : "#";
  const maxGuests = activePackage?.maxGuests ?? property.maxGuests;
  const selectedPackageRooms = activePackage?.accessibleRoomIds?.length
    ? (property.rooms ?? []).filter((room) => activePackage.accessibleRoomIds?.includes(room.id))
    : [];
  const changeGuests = (next: number) => setGuests(Math.min(maxGuests, Math.max(1, next)));
  const [activeField, setActiveField] = useState<"checkIn" | "checkOut">("checkIn");
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthCursor(effectiveStay.checkIn || TODAY));
  const calendarMonth = useMemo(() => buildCalendarMonth(visibleMonth.year, visibleMonth.month), [visibleMonth]);
  const calendarActiveField = activeField;

  useEffect(() => {
    const requiredMode =
      packageBookingAllowed && !stayBookingAllowed
        ? "package"
        : stayBookingAllowed && !packageBookingAllowed
          ? "stay"
          : bookingMode;

    if (requiredMode !== bookingMode) setBookingMode(requiredMode);

    if (requiredMode !== "package" || !packageBookingAllowed) {
      if (packageId) setPackageId(null);
      return;
    }

    if (!selectedPackage && bookingPackages[0]) setPackageId(bookingPackages[0].id);
  }, [
    bookingMode,
    bookingPackages,
    packageBookingAllowed,
    packageId,
    selectedPackage,
    setBookingMode,
    setPackageId,
    stayBookingAllowed,
  ]);

  useEffect(() => {
    if (selectedIsDayPackage && fullAccessPackage && checkOut > dayCheckout) setPackageId(fullAccessPackage.id);
  }, [checkOut, dayCheckout, fullAccessPackage, selectedIsDayPackage, setPackageId]);

  function moveMonth(offset: number) {
    const next = new Date(visibleMonth.year, visibleMonth.month + offset, 1);
    setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() });
  }

  function selectDate(dateKey: string) {
    if (dateKey < TODAY) return;

    if (selectedIsDayPackage && activeField === "checkOut" && effectiveStay.checkIn && dateKey > effectiveStay.checkIn) {
      if (hasBookedNightInRange(effectiveStay.checkIn, dateKey, bookedNightSet)) return;
      if (fullAccessPackage && dateKey > addDays(effectiveStay.checkIn, 1)) setPackageId(fullAccessPackage.id);
      setCheckOut(dateKey);
      setActiveField("checkIn");
      return;
    }

    if (selectedIsDayPackage) {
      const nextDayCheckout = addDays(dateKey, 1);
      if (bookedNightSet.has(dateKey) || hasBookedNightInRange(dateKey, nextDayCheckout, bookedNightSet)) return;
      setCheckIn(dateKey);
      setCheckOut(nextDayCheckout);
      setActiveField("checkIn");
      return;
    }

    if (activeField === "checkOut" && effectiveStay.checkIn && dateKey > effectiveStay.checkIn) {
      if (hasBookedNightInRange(effectiveStay.checkIn, dateKey, bookedNightSet)) return;
      setCheckOut(dateKey);
      setActiveField("checkIn");
      return;
    }

    if (bookedNightSet.has(dateKey)) return;

    setCheckIn(dateKey);
    const defaultCheckout = addDays(dateKey, 1);
    setCheckOut(
      hasBookedNightInRange(dateKey, defaultCheckout, bookedNightSet)
        ? ""
        : defaultCheckout,
    );
    setActiveField("checkOut");
  }

  return (
    <div className="scroll-mt-24 rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgb(8_63_53_/_0.12)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold tracking-normal text-[#083f35] min-[390px]:text-3xl">
            {formatCurrency(headlinePrice)}
            <span className="ml-1 text-sm font-medium text-black/50 min-[390px]:text-base">{headlinePriceLabel}</span>
          </p>
          <p className="mt-1 text-sm text-black/55">Up to {maxGuests} guests / {property.bedrooms} bedrooms</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f6f1e9] px-2.5 py-1.5 text-xs font-semibold text-[#083f35] min-[390px]:px-3 min-[390px]:text-sm">
          <Star size={14} fill="currentColor" /> {rating}
        </span>
      </div>

      {stayBookingAllowed && packageBookingAllowed ? (
        <div className="mt-4 grid grid-cols-2 rounded-lg bg-black/[0.04] p-1">
          {[
            ["stay", "Book Stay"],
            ["package", "Book Package"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                const nextMode = mode as "stay" | "package";
                setBookingMode(nextMode);
                setPackageId(nextMode === "package" ? selectedPackage?.id ?? bookingPackages[0]?.id ?? null : null);
              }}
              className={`min-h-10 rounded-md text-sm font-semibold transition ${effectiveBookingMode === mode ? "bg-white text-[#083f35] shadow-sm" : "text-black/55 hover:text-black"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {effectiveBookingMode === "package" && packageBookingAllowed ? (
        <div className="mt-4 grid gap-2">
          {bookingPackages.map((item) => {
            const active = activePackage?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPackageId(item.id);
                  if (item.unit === "day") {
                    setCheckOut(addDays(effectiveStay.checkIn, 1));
                    setActiveField("checkIn");
                  }
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${active ? "border-[#083f35] bg-[#083f35] text-white" : "border-black/10 bg-black/[0.02] hover:border-[#083f35]"}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <span className={active ? "text-white/80" : "text-black/55"}>{formatCurrency(calculateGuestPriceWithMarkup(item.weekdayRate))}</span>
                </span>
                <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-black/50"}`}>
                  {item.accessType}
                  {item.durationHours ? ` - ${item.durationHours} hours` : ""}
                  {item.sleepingCapacity ? ` - sleeps ${item.sleepingCapacity}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activePackage ? (
        <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-xs leading-5 text-black/60">
          <PackageAccessSummary
            floors={activePackage.accessibleFloors ?? []}
            rooms={selectedPackageRooms.map((room) => room.name)}
            included={activePackage.includedAmenities ?? []}
            accessType={activePackage.accessType}
          />
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-black/15 min-[390px]:mt-5">
        <div className="grid grid-cols-2 divide-x divide-black/10">
          <DateField
            active={calendarActiveField === "checkIn"}
            label={activeIsDayPackage ? "Date" : "Check-in"}
            time={activePackage?.checkInTime ?? STANDARD_CHECK_IN_TIME}
            value={effectiveStay.checkIn}
            onClick={() => setActiveField("checkIn")}
          />
          <DateField
            active={calendarActiveField === "checkOut"}
            label={activeIsDayPackage ? "Ends" : "Check-out"}
            time={activePackage?.checkOutTime ?? STANDARD_CHECK_OUT_TIME}
            value={activeIsDayPackage ? effectiveStay.checkIn : effectiveStay.checkOut}
            onClick={() => setActiveField("checkOut")}
          />
        </div>

        <div className="border-t border-black/10 p-2.5 min-[390px]:p-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="grid size-9 place-items-center rounded-full transition hover:bg-black/[0.05]"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold">
              {monthNames[calendarMonth.month]} {calendarMonth.year}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="grid size-9 place-items-center rounded-full transition hover:bg-black/[0.05]"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-[0.65rem] font-bold text-black/45">
            {weekdays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-0.5 min-[390px]:gap-1">
            {calendarMonth.cells.map((cell, index) =>
              cell ? (
                <CalendarDateButton
                  key={cell.dateKey}
                  cell={cell}
                  activeField={calendarActiveField}
                  checkIn={effectiveStay.checkIn}
                  checkOut={effectiveStay.checkOut}
                  bookedNightSet={bookedNightSet}
                  singleDayPackage={activeIsDayPackage && activeField !== "checkOut"}
                  onSelect={selectDate}
                />
              ) : (
                <div key={`blank-${index}`} className="min-h-11 rounded-lg min-[390px]:min-h-12" />
              ),
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] font-semibold text-black/50">
            <Legend swatch="bg-white ring-1 ring-black/15" label="Available" />
            <Legend swatch="bg-black/[0.08] ring-1 ring-black/10" label="Booked" />
            <Legend swatch="bg-[#083f35]" label="Selected" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-black/10 px-4 py-3">
          <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase text-black/50">
            <Users size={12} /> Guests
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => changeGuests(guests - 1)}
              disabled={guests <= 1}
              className="grid size-10 place-items-center rounded-full border border-black/15 text-[#083f35] transition hover:bg-black/[0.04] disabled:opacity-30"
              aria-label="Remove guest"
            >
              <Minus size={15} />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{guests}</span>
            <button
              type="button"
              onClick={() => changeGuests(guests + 1)}
              disabled={guests >= maxGuests}
              className="grid size-10 place-items-center rounded-full border border-black/15 text-[#083f35] transition hover:bg-black/[0.04] disabled:opacity-30"
              aria-label="Add guest"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      <Link
        href={reserveHref}
        aria-disabled={!canReserve}
        tabIndex={canReserve ? undefined : -1}
        className={`mt-4 flex min-h-13 items-center justify-center rounded-full px-6 py-3.5 text-sm font-bold uppercase text-white transition ${
          canReserve
            ? "bg-[#083f35] hover:bg-[#062f28] active:scale-[0.98]"
            : "pointer-events-none bg-black/25"
        }`}
      >
        {instantBook ? "Reserve now" : "Request to book"}
      </Link>

      {!canReserve ? (
        <p className="mt-3 text-center text-xs text-black/50">
          {selectedHasUnavailableNight
            ? "Some selected nights are already booked. Choose only available dates."
            : selectedStartsUnavailable
              ? "Choose an available check-in date."
              : "Select your check-in and checkout dates."}
        </p>
      ) : null}

      {validStay && !selectedHasUnavailableNight ? (
        <div className="mt-5 space-y-3 border-t border-black/10 pt-5 text-sm">
          <div className="flex justify-between text-black/70">
            <span className="min-w-0 pr-3 leading-5 underline decoration-black/20 underline-offset-4">
              {rateSummary}
            </span>
            <span className="shrink-0 font-medium">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-black/10 pt-3 text-base font-semibold text-[#083f35]">
            <span>Total before taxes</span>
            <span className="shrink-0">{formatCurrency(total)}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#053f34]/[0.06] px-4 py-3 text-xs leading-5 text-[#083f35]">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <span>
          {instantBook
            ? "Instant booking is enabled. Confirm dates to reserve immediately."
            : "Your request is sent to the host for approval before payment."}
        </span>
      </div>
    </div>
  );
}

function DateField({ active, label, time, value, onClick }: { active: boolean; label: string; time: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block min-h-20 px-3 py-3 text-left transition min-[390px]:px-4 ${active ? "bg-[#083f35]/[0.06]" : "hover:bg-black/[0.03]"}`}
    >
      <span className="flex items-center gap-1 text-[0.62rem] font-bold uppercase text-black/50 min-[390px]:gap-1.5 min-[390px]:text-[0.68rem]">
        <CalendarDays size={12} /> {label}
      </span>
      <span className="mt-1 block text-[0.8rem] font-semibold leading-snug text-[#1f1f1f] min-[390px]:text-sm">{value ? formatDisplayDate(value) : "Add date"}</span>
      <span className="mt-1 block text-[0.68rem] leading-snug text-black/50 min-[390px]:text-xs">{time}</span>
    </button>
  );
}

function CalendarDateButton({
  cell,
  activeField,
  checkIn,
  checkOut,
  bookedNightSet,
  singleDayPackage,
  onSelect,
}: {
  cell: CalendarDay;
  activeField: "checkIn" | "checkOut";
  checkIn: string;
  checkOut: string;
  bookedNightSet: Set<string>;
  singleDayPackage: boolean;
  onSelect: (dateKey: string) => void;
}) {
  const isPast = cell.dateKey < TODAY;
  const bookedNight = bookedNightSet.has(cell.dateKey);
  const unavailable = bookedNight || isPast;
  const canSelectCheckout =
    activeField === "checkOut" &&
    Boolean(checkIn) &&
    cell.dateKey > checkIn &&
    !hasBookedNightInRange(checkIn, cell.dateKey, bookedNightSet);
  const isStart = Boolean(checkIn) && cell.dateKey === checkIn;
  const isEnd = !singleDayPackage && Boolean(checkOut) && cell.dateKey === checkOut;
  const inRange = !singleDayPackage && Boolean(checkIn && checkOut) && cell.dateKey > checkIn && cell.dateKey < checkOut;
  const selected = isStart || isEnd;
  const disabled = !selected && (activeField === "checkIn" || !checkIn ? unavailable : !canSelectCheckout);
  const statusLabel = isStart ? (singleDayPackage ? "Selected" : "Check-in") : isEnd ? "Check-out" : unavailable ? "Booked" : "Open";
  const compactStatusLabel = isStart ? (singleDayPackage ? "Set" : "In") : isEnd ? "Out" : unavailable ? "Booked" : "Open";
  const narrowStatusLabel = unavailable ? "Full" : compactStatusLabel;
  const toneClass = selected
    ? "border-[#083f35] bg-[#083f35] text-white"
    : inRange && !unavailable
      ? "border-[#91d5c4] bg-[#e1f4ee] text-[#083f35]"
      : unavailable
        ? "border-black/10 bg-black/[0.08] text-black/35"
        : "border-black/10 bg-white text-black/70 hover:border-[#083f35]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(cell.dateKey)}
      aria-label={`${formatDisplayDate(cell.dateKey)} ${statusLabel}${unavailable ? ", unavailable" : ", available"}`}
      className={cx(
        "flex min-h-11 flex-col items-center justify-center rounded-md border p-1 text-center text-[0.7rem] transition min-[390px]:min-h-12 min-[390px]:rounded-lg min-[390px]:text-xs",
        toneClass,
        disabled && "cursor-not-allowed hover:border-black/10",
        isPast && !selected && "opacity-35",
      )}
    >
      <span className="block font-semibold">{cell.day}</span>
      <span className={cx("mt-0.5 block text-[0.56rem] font-semibold leading-none min-[360px]:hidden", unavailable && !selected && "line-through")}>
        {narrowStatusLabel}
      </span>
      <span className={cx("mt-0.5 hidden text-[0.56rem] font-semibold leading-none min-[360px]:block min-[430px]:hidden", unavailable && !selected && "line-through")}>
        {compactStatusLabel}
      </span>
      <span className={cx("mt-1 hidden text-[0.6rem] font-semibold leading-none min-[430px]:block", unavailable && !selected && "line-through")}>
        {statusLabel}
      </span>
    </button>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

function PackageAccessSummary({
  floors,
  rooms,
  included,
  accessType,
}: {
  floors: string[];
  rooms: string[];
  included: string[];
  accessType: string;
}) {
  const floorText = formatShortList(floors) || accessType;
  const roomText = rooms.filter(Boolean).length ? `${formatShortList(rooms)} room access` : "no bedroom access";
  const amenityText = formatShortList(included, 3);

  return (
    <p>
      <span className="font-semibold text-black/70">Access: </span>
      {floorText}; {roomText}
      {amenityText ? `; includes ${amenityText}.` : "."}
    </p>
  );
}

function formatShortList(items: string[], limit = 2) {
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);
  if (!visibleItems.length) return "";
  const shown = visibleItems.slice(0, limit);
  const remaining = visibleItems.length - shown.length;
  return `${shown.join(", ")}${remaining > 0 ? ` +${remaining} more` : ""}`;
}

type CalendarDay = {
  dateKey: string;
  day: number;
};

function buildCalendarMonth(year: number, zeroBasedMonth: number) {
  const firstDay = new Date(year, zeroBasedMonth, 1);
  const displayYear = firstDay.getFullYear();
  const displayMonth = firstDay.getMonth();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const leadingBlanks = new Date(displayYear, displayMonth, 1).getDay();
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7;
  const cells: Array<CalendarDay | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        dateKey: `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        day,
      };
    }),
    ...Array.from({ length: trailingBlanks }, () => null),
  ];

  return { year: displayYear, month: displayMonth, cells };
}

function getMonthCursor(dateKey: string) {
  const date = parseDateKey(dateKey);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parseDateKey(dateKey));
}

function formatRateSummary({
  guestNightlyPrice,
  guestWeekendPrice,
  weekdayNights,
  weekendNights,
  nights,
  unitName,
}: {
  guestNightlyPrice: number;
  guestWeekendPrice: number;
  weekdayNights: number;
  weekendNights: number;
  nights: number;
  unitName: "day" | "night";
}) {
  if (weekendNights > 0 && weekdayNights > 0 && guestWeekendPrice !== guestNightlyPrice) {
    return `${formatCurrency(guestNightlyPrice)} weekday / ${formatCurrency(guestWeekendPrice)} weekend`;
  }

  const displayedRate = weekendNights > 0 && weekdayNights === 0 ? guestWeekendPrice : guestNightlyPrice;
  return `${formatCurrency(displayedRate)} x ${nights} ${unitName}${nights === 1 ? "" : "s"}`;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}
