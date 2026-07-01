"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, getBlockedDateKeys, hasBookedNightInRange, parseDateKey } from "@/lib/availability-calendar";
import { dateMatchesPackageDays, packageAvailableDaySet } from "@/lib/package-availability";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type DateRange = { checkIn: string; checkOut: string };
type ActiveDateField = "checkIn" | "checkOut";
type CalendarDay = { dateKey: string; day: number };

function overlapsBooked(checkIn: string, checkOut: string, ranges: DateRange[]) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;
  // Half-open overlap: [checkIn, checkOut) intersects [range.checkIn, range.checkOut).
  return ranges.some((range) => checkIn < range.checkOut && checkOut > range.checkIn);
}

function getBookedNightKeys(ranges: DateRange[]) {
  return [...new Set(ranges.flatMap((range) => getBlockedDateKeys(range.checkIn, range.checkOut)))].sort();
}

function getMonthCursor(dateKey: string) {
  const date = parseDateKey(dateKey);
  return { year: date.getFullYear(), month: date.getMonth() };
}

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

function formatDateDisplay(value: string) {
  const date = parseDateKey(value);
  if (Number.isNaN(date.getTime())) return "Select date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatReadableDate(value: string) {
  const date = parseDateKey(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function CheckoutDates({
  initialCheckIn,
  initialCheckOut,
  minDate,
  unavailableRanges,
  checkInTime,
  checkOutTime,
  availableDays,
}: {
  initialCheckIn: string;
  initialCheckOut: string;
  minDate: string;
  unavailableRanges: DateRange[];
  checkInTime: string;
  checkOutTime: string;
  availableDays?: number[];
}) {
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [activeField, setActiveField] = useState<ActiveDateField>("checkIn");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthCursor(initialCheckIn || minDate));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  const availableDaySet = useMemo(() => packageAvailableDaySet(availableDays), [availableDays]);
  const bookedNightKeys = useMemo(() => getBookedNightKeys(unavailableRanges), [unavailableRanges]);
  const bookedNightSet = useMemo(() => new Set(bookedNightKeys), [bookedNightKeys]);
  const calendarMonth = useMemo(() => buildCalendarMonth(visibleMonth.year, visibleMonth.month), [visibleMonth]);
  const conflict = overlapsBooked(checkIn, checkOut, unavailableRanges);
  const checkInClosed = !dateMatchesPackageDays(checkIn, availableDaySet);

  useEffect(() => {
    if (!calendarOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setCalendarOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [calendarOpen]);

  useEffect(() => {
    const message =
      checkOut <= checkIn
        ? "Check-out must be after check-in."
        : checkInClosed
          ? "This package is not available on the selected check-in day."
          : conflict
          ? "These dates overlap an existing booking. Choose another stay window."
          : "";
    checkInRef.current?.setCustomValidity(checkInClosed ? message : "");
    checkOutRef.current?.setCustomValidity(message);
  }, [checkIn, checkInClosed, checkOut, conflict]);

  function openCalendar(field: ActiveDateField) {
    setActiveField(field);
    setCalendarOpen(true);
    setVisibleMonth(getMonthCursor(field === "checkOut" && checkOut ? checkOut : checkIn || minDate));
  }

  function moveMonth(offset: number) {
    const next = new Date(visibleMonth.year, visibleMonth.month + offset, 1);
    setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() });
  }

  function selectDate(dateKey: string) {
    if (dateKey < minDate) return;

    if (activeField === "checkOut" && checkIn && dateKey > checkIn) {
      if (hasBookedNightInRange(checkIn, dateKey, bookedNightSet)) return;
      setCheckOut(dateKey);
      setCalendarOpen(false);
      return;
    }

    if (!dateMatchesPackageDays(dateKey, availableDaySet)) return;

    if (bookedNightSet.has(dateKey)) return;

    const nextCheckout =
      checkOut > dateKey && !hasBookedNightInRange(dateKey, checkOut, bookedNightSet)
        ? checkOut
        : addDays(dateKey, 1);

    setCheckIn(dateKey);
    setCheckOut(nextCheckout);
    setActiveField("checkOut");
    setVisibleMonth(getMonthCursor(dateKey));
  }

  return (
    <div ref={wrapperRef} className="relative mt-5">
      <input
        ref={checkInRef}
        name="checkIn"
        type="date"
        value={checkIn}
        onChange={(event) => setCheckIn(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        required
      />
      <input
        ref={checkOutRef}
        name="checkOut"
        type="date"
        value={checkOut}
        onChange={(event) => setCheckOut(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DateFieldButton
          active={activeField === "checkIn" && calendarOpen}
          conflict={conflict}
          label="Check-in"
          time={`Check-in ${checkInTime}`}
          value={checkIn}
          onClick={() => openCalendar("checkIn")}
        />
        <DateFieldButton
          active={activeField === "checkOut" && calendarOpen}
          conflict={conflict}
          label="Check-out"
          time={`Check-out ${checkOutTime}`}
          value={checkOut}
          onClick={() => openCalendar("checkOut")}
        />
      </div>

      {calendarOpen ? (
        <div
          className={cx(
            "absolute left-0 top-full z-30 mt-2 w-full max-w-[22rem] rounded-2xl border border-black/10 bg-white p-4 shadow-[0_18px_48px_rgb(0_0_0_/_0.18)]",
            activeField === "checkOut" && "sm:left-auto sm:right-0",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="grid size-9 place-items-center rounded-full transition hover:bg-black/[0.05]"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold">
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

          <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-black/45">
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
                  checkIn={checkIn}
                  checkOut={checkOut}
                  minDate={minDate}
                  bookedNightSet={bookedNightSet}
                  closedForCheckIn={!dateMatchesPackageDays(cell.dateKey, availableDaySet)}
                  onSelect={selectDate}
                />
              ) : (
                <div key={`blank-${index}`} className="size-9" />
              ),
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-black/55">
            <Legend swatch="bg-white ring-1 ring-black/15" label="Available" />
            <Legend swatch="bg-rose-50 ring-1 ring-rose-200" label="Booked" crossed />
            <Legend swatch="bg-[#083f35]" label="Selected" />
          </div>
        </div>
      ) : null}

      {checkInClosed || conflict ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {checkInClosed
            ? "This package is not available on the selected check-in day."
            : "These dates overlap an existing booking. Please choose another stay window."}
        </p>
      ) : null}
    </div>
  );
}

function DateFieldButton({
  active,
  conflict,
  label,
  time,
  value,
  onClick,
}: {
  active: boolean;
  conflict: boolean;
  label: string;
  time: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cx(
        "block min-h-28 w-full rounded-2xl border p-4 text-left transition",
        active
          ? "border-[#083f35] bg-[#083f35]/[0.04] ring-4 ring-[#083f35]/10"
          : conflict
            ? "border-rose-300 bg-rose-50/50"
            : "border-black/10 bg-white hover:border-[#083f35]/40",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <CalendarDays size={16} className="text-[#083f35]" />
        {label}
      </span>
      <span className="mt-1 block text-xs text-black/50">{time}</span>
      <span className="mt-3 block text-lg font-semibold text-black">{formatDateDisplay(value)}</span>
    </button>
  );
}

function CalendarDateButton({
  cell,
  activeField,
  checkIn,
  checkOut,
  minDate,
  bookedNightSet,
  closedForCheckIn,
  onSelect,
}: {
  cell: CalendarDay;
  activeField: ActiveDateField;
  checkIn: string;
  checkOut: string;
  minDate: string;
  bookedNightSet: Set<string>;
  closedForCheckIn: boolean;
  onSelect: (dateKey: string) => void;
}) {
  const isPast = cell.dateKey < minDate;
  const bookedNight = bookedNightSet.has(cell.dateKey);
  const startUnavailable = isPast || bookedNight || closedForCheckIn;
  const isStart = Boolean(checkIn) && cell.dateKey === checkIn;
  const isEnd = Boolean(checkOut) && cell.dateKey === checkOut;
  const inRange = Boolean(checkIn && checkOut) && cell.dateKey > checkIn && cell.dateKey < checkOut;
  const selected = isStart || isEnd;
  const canSelectCheckout =
    activeField === "checkOut" &&
    Boolean(checkIn) &&
    cell.dateKey > checkIn &&
    !hasBookedNightInRange(checkIn, cell.dateKey, bookedNightSet);
  const disabled = selected
    ? false
    : activeField === "checkOut" && checkIn
      ? isPast || !canSelectCheckout
      : startUnavailable;
  const status = isPast ? "past" : bookedNight ? "booked" : closedForCheckIn ? "closed" : selected ? "selected" : "available";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(cell.dateKey)}
      aria-label={`${formatReadableDate(cell.dateKey)} is ${status}`}
      title={`${formatReadableDate(cell.dateKey)} - ${status}`}
      className={cx(
        "grid size-9 place-items-center rounded-full border text-sm font-semibold transition",
        selected
          ? "border-[#083f35] bg-[#083f35] text-white"
          : inRange && !bookedNight
            ? "border-[#91d5c4] bg-[#e1f4ee] text-[#083f35]"
            : bookedNight || (activeField !== "checkOut" && closedForCheckIn)
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-transparent bg-white text-black hover:border-[#083f35]/35",
        disabled && "cursor-not-allowed",
        isPast && !selected && "opacity-35",
      )}
    >
      <span className={cx((bookedNight || closedForCheckIn) && !selected && "line-through decoration-2")}>{cell.day}</span>
    </button>
  );
}

function Legend({ swatch, label, crossed = false }: { swatch: string; label: string; crossed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${swatch}`} />
      <span className={crossed ? "line-through decoration-2" : undefined}>{label}</span>
    </span>
  );
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}
