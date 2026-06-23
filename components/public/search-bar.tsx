'use client';

import { Building2, MapPin, Minus, Navigation, Search, Trees, Waves, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";

type Panel = "where" | "when" | "who" | null;

const destinations = [
  { name: "Nearby", description: "Find what's around you", icon: Navigation },
  { name: "Baguio, Philippines", description: "Great for a weekend getaway", icon: Building2 },
  { name: "Tagaytay, Philippines", description: "For nature-lovers", icon: Building2 },
  { name: "San Juan Beach, Philippines", description: "For a beach break", icon: Waves },
  { name: "Mandaluyong, Philippines", description: "Near Metro Manila stays", icon: Trees },
  { name: "Cebu City, Philippines", description: "For sights like Magellan's Cross", icon: Building2 },
  { name: "Burnham Park, Philippines", description: "Popular nearby", icon: MapPin },
];

const guestRows = [
  ["Adults", "Ages 13 or above"],
  ["Children", "Ages 2 - 12"],
  ["Infants", "Under 2"],
  ["Pets", "Bringing a service animal?"],
] as const;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildMonthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  return cells;
}

function parseISODate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShort(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type SearchBarProps = {
  variant?: "responsive" | "desktop" | "mobile";
};

export function SearchBar({ variant = "responsive" }: SearchBarProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [location, setLocation] = useState(() => searchParams.get("location") ?? "");
  const [checkIn, setCheckIn] = useState<Date | null>(() => parseISODate(searchParams.get("checkIn")));
  const [checkOut, setCheckOut] = useState<Date | null>(() => parseISODate(searchParams.get("checkOut")));
  const [guests, setGuests] = useState<[number, number, number, number]>(() => {
    const total = Math.max(0, Number(searchParams.get("guests") ?? 0) || 0);
    return [total, 0, 0, 0];
  });
  const [nearCoords, setNearCoords] = useState<{ lat: number; lng: number } | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const months = useMemo(() => {
    return [0, 1].map((offset) => {
      const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        cells: buildMonthCells(date.getFullYear(), date.getMonth()),
      };
    });
  }, [today]);

  const datesLabel = checkIn
    ? checkOut
      ? `${formatShort(checkIn)} - ${formatShort(checkOut)}`
      : formatShort(checkIn)
    : "Add dates";

  const guestLabel = useMemo(() => {
    const total = guests[0] + guests[1];
    return total > 0 ? `${total} guest${total === 1 ? "" : "s"}` : "Add guests";
  }, [guests]);

  const locationLabel = location.trim() || "Search destinations";
  const mobileSummary = [
    location.trim() || "Anywhere",
    datesLabel === "Add dates" ? "Any week" : datesLabel,
    guestLabel,
  ].join(" / ");

  const locationQuery = location.trim().toLowerCase();
  const filteredDestinations = locationQuery
    ? destinations.filter((destination) => destination.name.toLowerCase().includes(locationQuery))
    : destinations;

  function selectDate(date: Date) {
    if (!checkIn || checkOut) {
      setCheckIn(date);
      setCheckOut(null);
      return;
    }
    if (date.getTime() <= checkIn.getTime()) {
      setCheckIn(date);
      return;
    }
    setCheckOut(date);
    setPanel("who");
  }

  function isEndpoint(date: Date) {
    const time = date.getTime();
    return (checkIn !== null && time === checkIn.getTime()) || (checkOut !== null && time === checkOut.getTime());
  }

  function isInRange(date: Date) {
    if (!checkIn || !checkOut) return false;
    const time = date.getTime();
    return time > checkIn.getTime() && time < checkOut.getTime();
  }

  function dateButtonLabel(date: Date, past: boolean) {
    const label = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (past) return `${label}. Past dates cannot be selected.`;
    if (checkIn && date.getTime() === checkIn.getTime()) return `${label}. Selected check-in date.`;
    if (checkOut && date.getTime() === checkOut.getTime()) return `${label}. Selected checkout date.`;
    if (checkIn && !checkOut && date.getTime() > checkIn.getTime()) return `${label}. Select as checkout date.`;
    return `${label}. Select as check-in date.`;
  }

  function requestNearby() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearCoords(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setNearCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setNearCoords(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  }

  function resetSearch() {
    setLocation("");
    setCheckIn(null);
    setCheckOut(null);
    setGuests([0, 0, 0, 0]);
    setNearCoords(null);
  }

  function search() {
    setPanel(null);
    const params = new URLSearchParams();
    const trimmedLocation = location.trim();
    const guestTotal = guests[0] + guests[1];
    if (trimmedLocation) params.set("location", trimmedLocation);
    if (guestTotal > 0) params.set("guests", String(guestTotal));
    if (checkIn) params.set("checkIn", toISODate(checkIn));
    if (checkOut) params.set("checkOut", toISODate(checkOut));
    if (trimmedLocation === "Nearby" && nearCoords) {
      params.set("near", `${nearCoords.lat.toFixed(5)},${nearCoords.lng.toFixed(5)}`);
    }
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  }

  function mobileNext() {
    if (panel === "where") {
      setPanel("when");
      return;
    }
    if (panel === "when") {
      setPanel("who");
      return;
    }
    search();
  }

  function updateGuest(index: number, delta: number) {
    setGuests((current) => current.map((value, itemIndex) => (
      itemIndex === index ? Math.max(0, value + delta) : value
    )) as [number, number, number, number]);
  }

  useEffect(() => {
    if (!panel) return;

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (searchRef.current?.contains(target) || mobileSheetRef.current?.contains(target)) return;
      setPanel(null);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [panel]);

  useEffect(() => {
    if (!panel || typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [panel]);

  const activeShell = panel ? "border-transparent bg-[#ebebeb] shadow-[0_10px_32px_rgb(0_0_0_/_0.08)]" : "border bg-white shadow-[0_10px_30px_rgb(0_0_0_/_0.08)]";
  const activeSection = "bg-white shadow-[0_3px_16px_rgb(0_0_0_/_0.14)]";
  const inactiveSection = "active:bg-[#ebebeb] md:hover:bg-[#ebebeb]";
  const showMobile = variant !== "desktop";
  const showDesktop = variant !== "mobile";

  function destinationList() {
    return (
      <div className="mt-4 space-y-3">
        {filteredDestinations.map(({ name, description, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setLocation(name);
              if (name === "Nearby") requestNearby();
              else setNearCoords(null);
              setPanel("when");
            }}
            className="flex min-h-14 w-full items-center gap-4 rounded-2xl p-2 text-left active:bg-black/[0.04] md:hover:bg-black/[0.04]"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e8f4ef] text-[#083f35]">
              <Icon size={25} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-semibold">{name}</span>
              <span className="block text-sm text-black/55">{description}</span>
            </span>
          </button>
        ))}
        {filteredDestinations.length === 0 && (
          <button
            type="button"
            onClick={() => setPanel("when")}
            className="flex min-h-14 w-full items-center gap-4 rounded-2xl p-2 text-left active:bg-black/[0.04] md:hover:bg-black/[0.04]"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e8f4ef] text-[#083f35]">
              <Search size={22} strokeWidth={1.8} />
            </span>
            <span className="block font-semibold">Search for &quot;{location.trim()}&quot;</span>
          </button>
        )}
      </div>
    );
  }

  function calendarPicker() {
    return (
      <>
        <div className="mx-auto mb-5 grid h-12 w-full max-w-72 grid-cols-2 rounded-full bg-black/[0.06] p-1 text-sm font-semibold">
          <span className="grid place-items-center rounded-full bg-black px-5 text-white shadow-sm">Dates</span>
          <span className="grid place-items-center rounded-full px-5 text-black/80">Flexible</span>
        </div>
        <p className="mb-6 text-center text-sm text-black/55">
          {checkIn ? (checkOut ? `${formatShort(checkIn)} - ${formatShort(checkOut)}` : "Select your check-out date") : "Select your check-in date"}
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          {months.map(({ year, month, cells }) => (
            <div key={`${year}-${month}`}>
              <p className="mb-4 text-center text-lg font-semibold">{MONTH_NAMES[month]} {year}</p>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {WEEKDAYS.map((day, dayIndex) => (
                  <span key={`${year}-${month}-h${dayIndex}`} className="text-black/55">
                    {day}
                  </span>
                ))}
                {cells.map((date, cellIndex) => {
                  if (!date) return <span key={`${year}-${month}-b${cellIndex}`} />;
                  const past = date.getTime() < today.getTime();
                  const endpoint = isEndpoint(date);
                  const inRange = isInRange(date);
                  return (
                    <button
                      key={date.getTime()}
                      type="button"
                      aria-label={dateButtonLabel(date, past)}
                      disabled={past}
                      onClick={() => selectDate(date)}
                      className={`grid h-10 place-items-center rounded-full transition ${
                        past
                          ? "cursor-not-allowed text-black/25 line-through"
                          : endpoint
                            ? "bg-black font-semibold text-white"
                            : inRange
                              ? "bg-[#083f35]/10 text-[#083f35]"
                              : "active:bg-black/[0.06] md:hover:bg-black/[0.06]"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {(checkIn || checkOut) && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setCheckIn(null);
                setCheckOut(null);
              }}
              className="min-h-11 rounded-full px-4 text-sm font-semibold text-[#083f35] underline underline-offset-4"
            >
              Clear dates
            </button>
          </div>
        )}
      </>
    );
  }

  function guestControls() {
    return (
      <div className="space-y-5">
        {guestRows.map(([label, hint], index) => (
          <div key={label} className="flex items-center justify-between border-b pb-5 last:border-b-0 last:pb-0">
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-black/55">{hint}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateGuest(index, -1)}
                disabled={guests[index] === 0}
                className="grid h-10 w-10 place-items-center rounded-full border border-black/15 text-black transition disabled:cursor-not-allowed disabled:text-black/25"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-4 text-center">{guests[index]}</span>
              <button
                type="button"
                onClick={() => updateGuest(index, 1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-black/15 text-xl transition active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function mobileCard(target: Exclude<Panel, null>, label: string, value: string) {
    const active = panel === target;
    if (!active) {
      return (
        <button
          type="button"
          onClick={() => setPanel(target)}
          className="flex min-h-16 w-full items-center justify-between rounded-3xl bg-white px-6 text-left shadow-[0_3px_16px_rgb(0_0_0_/_0.08)]"
        >
          <span className="text-black/55">{label}</span>
          <span className="max-w-[62%] truncate text-sm font-semibold">{value}</span>
        </button>
      );
    }

    return (
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_8px_28px_rgb(0_0_0_/_0.12)]">
        {target === "where" ? (
          <>
            <h2 className="text-2xl font-semibold">Where?</h2>
            <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-black/20 px-4">
              <Search size={18} className="text-black/65" />
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Search destinations"
                aria-label="Search destinations"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/55"
                autoFocus
              />
            </label>
            <p className="mt-5 text-sm text-black/55">{locationQuery ? "Matching destinations" : "Suggested destinations"}</p>
            {destinationList()}
          </>
        ) : null}

        {target === "when" ? (
          <>
            <h2 className="text-2xl font-semibold">When?</h2>
            <div className="mt-5">{calendarPicker()}</div>
          </>
        ) : null}

        {target === "who" ? (
          <>
            <h2 className="text-2xl font-semibold">Who?</h2>
            <div className="mt-5">{guestControls()}</div>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <div ref={searchRef} className="relative z-[60] text-black">
      {showMobile ? (
        <button
          type="button"
          onClick={() => setPanel("where")}
          className="flex min-h-14 w-full items-center gap-3 rounded-full border border-black/10 bg-white px-4 text-left text-sm text-black shadow-[0_2px_12px_rgb(0_0_0_/_0.10)] transition active:scale-[0.99] md:hidden"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
            <Search size={16} strokeWidth={3} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{location.trim() || "Start your search"}</span>
            <span className="block truncate text-xs text-black/55">{mobileSummary}</span>
          </span>
        </button>
      ) : null}

      {showMobile && panel && typeof document !== "undefined" ? createPortal((
        <div
          ref={mobileSheetRef}
          data-lenis-prevent
          className="fixed inset-0 z-[1000] overflow-y-auto bg-[#f7f7f7] px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 md:hidden"
        >
          <div className="mx-auto max-w-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <BrandLogo variant="green" className="h-9 w-auto" priority={false} />
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close search"
                className="grid size-11 place-items-center rounded-full bg-white shadow-[0_4px_18px_rgb(0_0_0_/_0.12)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {mobileCard("where", "Where", locationLabel)}
              {mobileCard("when", "When", datesLabel)}
              {mobileCard("who", "Who", guestLabel)}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-[1010] border-t border-black/10 bg-[#f7f7f7]/95 px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto flex max-w-md items-center justify-between">
              <button
                type="button"
                onClick={resetSearch}
                className="ml-12 min-h-12 rounded-full px-1 text-sm font-semibold underline underline-offset-4"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={mobileNext}
                aria-label={panel === "who" ? "Search selected stays" : "Continue search"}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#083f35] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(8_63_53_/_0.22)]"
              >
                {panel === "who" ? <Search size={16} strokeWidth={3} /> : null}
                {panel === "who" ? "Search" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ), document.body) : null}

      {showDesktop ? (
      <div className={`relative z-[70] hidden gap-0 overflow-hidden rounded-full transition md:grid md:grid-cols-[1.1fr_.8fr_.8fr_auto] ${activeShell}`}>
        <label className={`relative flex min-h-16 cursor-text flex-col justify-center border-b px-5 py-4 transition md:rounded-full md:border-b-0 md:px-6 ${panel === "where" ? activeSection : inactiveSection}`}>
          <span className="text-xs font-semibold">Where</span>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            onFocus={() => setPanel("where")}
            onKeyDown={(event) => {
              if (event.key === "Enter") setPanel("when");
            }}
            placeholder="Search destinations"
            aria-label="Where"
            className="mt-1 w-full truncate bg-transparent text-sm text-black/65 outline-none placeholder:text-black/55"
          />
        </label>
        <button type="button" onClick={() => setPanel("when")} className={`relative min-h-16 border-b px-5 py-4 text-left transition before:absolute before:left-0 before:top-1/2 before:hidden before:h-8 before:w-px before:-translate-y-1/2 before:bg-black/10 md:rounded-full md:border-b-0 md:px-6 md:before:block ${panel === "when" ? activeSection : inactiveSection} ${panel === "where" || panel === "when" ? "md:before:hidden" : ""}`}>
          <p className="text-xs font-semibold">When</p>
          <p className="mt-1 text-sm text-black/60">{datesLabel}</p>
        </button>
        <button type="button" onClick={() => setPanel("who")} className={`relative min-h-16 px-5 py-4 text-left transition before:absolute before:left-0 before:top-1/2 before:hidden before:h-8 before:w-px before:-translate-y-1/2 before:bg-black/10 md:rounded-full md:px-6 md:before:block ${panel === "who" ? activeSection : inactiveSection} ${panel === "when" || panel === "who" ? "md:before:hidden" : ""}`}>
          <p className="text-xs font-semibold">Who</p>
          <p className="mt-1 text-sm text-black/60">{guestLabel}</p>
        </button>
        <button type="button" onClick={search} aria-label="Search stays" className="m-2 flex h-14 w-auto items-center justify-center justify-self-end rounded-full bg-[#083f35] px-5 text-base font-semibold text-white">
          <Search size={17} strokeWidth={3} />
          <span className="ml-2">Search</span>
        </button>
      </div>
      ) : null}

      {showDesktop && panel && <button aria-label="Close search panel" onClick={() => setPanel(null)} className="fixed inset-0 z-[55] hidden bg-transparent md:block" />}

      {showDesktop && panel === "where" && (
        <div data-lenis-prevent className="absolute left-0 top-[calc(100%+12px)] z-[80] hidden max-h-[min(70vh,34rem)] w-[min(430px,calc(100vw-2rem))] overflow-auto rounded-[2rem] bg-white p-6 text-black shadow-[0_18px_50px_rgb(0_0_0_/_0.22)] md:block">
          <p className="text-sm text-black/55">{locationQuery ? "Matching destinations" : "Suggested destinations"}</p>
          {destinationList()}
        </div>
      )}

      {showDesktop && panel === "when" && (
        <div data-lenis-prevent className="absolute left-1/2 top-[calc(100%+12px)] z-[80] hidden max-h-[min(70vh,38rem)] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 overflow-auto rounded-[2rem] bg-white p-6 text-black shadow-[0_18px_50px_rgb(0_0_0_/_0.22)] md:block">
          {calendarPicker()}
        </div>
      )}

      {showDesktop && panel === "who" && (
        <div data-lenis-prevent className="absolute right-0 top-[calc(100%+12px)] z-[80] hidden max-h-[min(70vh,32rem)] w-[min(430px,calc(100vw-2rem))] overflow-auto rounded-[2rem] bg-white p-5 text-black shadow-[0_18px_50px_rgb(0_0_0_/_0.22)] md:block">
          {guestControls()}
        </div>
      )}
    </div>
  );
}
