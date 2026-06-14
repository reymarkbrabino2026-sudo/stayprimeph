"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Minus, Plus, ShieldCheck, Star, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { UnavailableStay } from "@/lib/availability-calendar";
import { addDays, getBookedNightKeys, getNextAvailableStay, hasBookedNightInRange, parseDateKey } from "@/lib/availability-calendar";
import type { Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  TODAY,
  buildReserveHref,
  computePrice,
  useReservationStore,
} from "@/stores/reservation-store";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function RoomReservationCard({
  property,
  rating,
  unavailableStays = [],
}: {
  property: Property;
  rating: string;
  unavailableStays?: UnavailableStay[];
}) {
  const { checkIn, checkOut, guests, setCheckIn, setCheckOut, setGuests } = useReservationStore();
  const instantBook = property.rules.includes("Instant book enabled");
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
  const { nights, validStay, subtotal, serviceFee, total } = computePrice(property.pricePerNight, effectiveStay.checkIn, effectiveStay.checkOut);
  const selectedHasUnavailableNight = validStay && hasBookedNightInRange(effectiveStay.checkIn, effectiveStay.checkOut, bookedNightSet);
  const canReserve = validStay && !selectedHasUnavailableNight;
  const reserveHref = buildReserveHref(property.id, effectiveStay.checkIn, effectiveStay.checkOut, guests);
  const changeGuests = (next: number) => setGuests(Math.min(property.maxGuests, Math.max(1, next)));
  const [activeField, setActiveField] = useState<"checkIn" | "checkOut">("checkIn");
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthCursor(effectiveStay.checkIn));
  const calendarMonth = useMemo(() => buildCalendarMonth(visibleMonth.year, visibleMonth.month), [visibleMonth]);

  function moveMonth(offset: number) {
    const next = new Date(visibleMonth.year, visibleMonth.month + offset, 1);
    setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() });
  }

  function selectDate(dateKey: string) {
    if (dateKey < TODAY) return;

    if (activeField === "checkOut" && dateKey > effectiveStay.checkIn) {
      if (hasBookedNightInRange(effectiveStay.checkIn, dateKey, bookedNightSet)) return;
      setCheckOut(dateKey);
      setActiveField("checkIn");
      return;
    }

    if (bookedNightSet.has(dateKey)) return;

    setCheckIn(dateKey);
    if (effectiveStay.checkOut <= dateKey || hasBookedNightInRange(dateKey, effectiveStay.checkOut, bookedNightSet)) {
      setCheckOut(addDays(dateKey, 1));
    }
    setActiveField("checkOut");
  }

  return (
    <div className="scroll-mt-28 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgb(8_63_53_/_0.16)] sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-[-0.03em] text-[#083f35]">
            {formatCurrency(property.pricePerNight)}
            <span className="text-base font-medium text-black/50"> / night</span>
          </p>
          <p className="mt-1 text-sm text-black/55">Up to {property.maxGuests} guests &middot; {property.bedrooms} bedrooms</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f1e9] px-3 py-1.5 text-sm font-semibold text-[#083f35]">
          <Star size={14} fill="currentColor" /> {rating}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/15">
        <div className="grid grid-cols-2 divide-x divide-black/10">
          <DateField
            active={activeField === "checkIn"}
            label="Check-in"
            value={effectiveStay.checkIn}
            onClick={() => setActiveField("checkIn")}
          />
          <DateField
            active={activeField === "checkOut"}
            label="Checkout"
            value={effectiveStay.checkOut}
            onClick={() => setActiveField("checkOut")}
          />
        </div>

        <div className="border-t border-black/10 p-3">
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
          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarMonth.cells.map((cell, index) =>
              cell ? (
                <CalendarDateButton
                  key={cell.dateKey}
                  cell={cell}
                  activeField={activeField}
                  checkIn={effectiveStay.checkIn}
                  checkOut={effectiveStay.checkOut}
                  bookedNightSet={bookedNightSet}
                  onSelect={selectDate}
                />
              ) : (
                <div key={`blank-${index}`} className="min-h-12 rounded-lg" />
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
          <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-black/50">
            <Users size={12} /> Guests
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => changeGuests(guests - 1)}
              disabled={guests <= 1}
              className="grid size-8 place-items-center rounded-full border border-black/15 text-[#083f35] transition hover:bg-black/[0.04] disabled:opacity-30"
              aria-label="Remove guest"
            >
              <Minus size={15} />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{guests}</span>
            <button
              type="button"
              onClick={() => changeGuests(guests + 1)}
              disabled={guests >= property.maxGuests}
              className="grid size-8 place-items-center rounded-full border border-black/15 text-[#083f35] transition hover:bg-black/[0.04] disabled:opacity-30"
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
        className={`mt-4 flex min-h-13 items-center justify-center rounded-full px-6 py-3.5 text-sm font-bold uppercase tracking-[0.08em] text-white transition ${
          canReserve
            ? "bg-[#083f35] hover:bg-[#062f28] active:scale-[0.98]"
            : "pointer-events-none bg-black/25"
        }`}
      >
        {instantBook ? "Reserve now" : "Request to book"}
      </Link>

      <p className="mt-3 text-center text-xs text-black/50">
        {selectedHasUnavailableNight
          ? "Some selected nights are already booked. Choose only available dates."
          : validStay
            ? "You won't be charged yet"
            : "Select a checkout date after your check-in"}
      </p>

      {validStay && !selectedHasUnavailableNight ? (
        <div className="mt-5 space-y-3 border-t border-black/10 pt-5 text-sm">
          <div className="flex justify-between text-black/70">
            <span className="underline decoration-black/20 underline-offset-4">
              {formatCurrency(property.pricePerNight)} x {nights} night{nights === 1 ? "" : "s"}
            </span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-black/70">
            <span className="underline decoration-black/20 underline-offset-4">Service fee</span>
            <span>{formatCurrency(serviceFee)}</span>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-3 text-base font-semibold text-[#083f35]">
            <span>Total before taxes</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-[#053f34]/[0.06] px-4 py-3 text-xs leading-5 text-[#083f35]">
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

function DateField({ active, label, value, onClick }: { active: boolean; label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block px-4 py-3 text-left transition ${active ? "bg-[#083f35]/[0.06]" : "hover:bg-black/[0.03]"}`}
    >
      <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-black/50">
        <CalendarDays size={12} /> {label}
      </span>
      <span className="mt-1 block text-sm font-semibold text-[#1f1f1f]">{formatDisplayDate(value)}</span>
    </button>
  );
}

function CalendarDateButton({
  cell,
  activeField,
  checkIn,
  checkOut,
  bookedNightSet,
  onSelect,
}: {
  cell: CalendarDay;
  activeField: "checkIn" | "checkOut";
  checkIn: string;
  checkOut: string;
  bookedNightSet: Set<string>;
  onSelect: (dateKey: string) => void;
}) {
  const isPast = cell.dateKey < TODAY;
  const bookedNight = bookedNightSet.has(cell.dateKey);
  const unavailable = bookedNight || isPast;
  const canSelectCheckout =
    activeField === "checkOut" &&
    cell.dateKey > checkIn &&
    !hasBookedNightInRange(checkIn, cell.dateKey, bookedNightSet);
  const isStart = cell.dateKey === checkIn;
  const isEnd = cell.dateKey === checkOut;
  const inRange = cell.dateKey > checkIn && cell.dateKey < checkOut;
  const selected = isStart || isEnd;
  const disabled = !selected && (activeField === "checkIn" ? unavailable : !canSelectCheckout);
  const statusLabel = isStart ? "Check-in" : isEnd ? "Checkout" : unavailable ? "Booked" : "Open";
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
      aria-label={`${formatDisplayDate(cell.dateKey)} ${unavailable ? "unavailable" : "available"}`}
      className={cx(
        "min-h-12 rounded-lg border p-1 text-left text-xs transition",
        toneClass,
        disabled && "cursor-not-allowed hover:border-black/10",
        isPast && !selected && "opacity-35",
      )}
    >
      <span className="block font-semibold">{cell.day}</span>
      <span className={cx("mt-1 block truncate text-[0.6rem] font-semibold", unavailable && !selected && "line-through")}>
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

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}
