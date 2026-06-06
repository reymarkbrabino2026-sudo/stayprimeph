'use client';

import { Building2, MapPin, Minus, Navigation, Search, Trees, Waves } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Panel = "where" | "when" | "who" | null;

const destinations = [
  { name: "Nearby", description: "Find what's around you", icon: Navigation },
  { name: "Baguio, Philippines", description: "Great for a weekend getaway", icon: Building2 },
  { name: "Tagaytay, Philippines", description: "For nature-lovers", icon: Building2 },
  { name: "San Juan Beach, Philippines", description: "For a trip abroad", icon: Waves },
  { name: "Mandaluyong, Philippines", description: "Near you", icon: Trees },
  { name: "Cebu City, Philippines", description: "For sights like Magellan's Cross", icon: Building2 },
  { name: "Burnham Park, Philippines", description: "Popular nearby", icon: MapPin },
];

const guestRows = [
  ["Adults", "Ages 13 or above"],
  ["Children", "Ages 2 - 12"],
  ["Infants", "Under 2"],
  ["Pets", "Bringing a service animal?"],
] as const;

export function SearchBar() {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [location, setLocation] = useState("Search destinations");
  const [dates, setDates] = useState("Add dates");
  const [guests, setGuests] = useState([0, 0, 0, 0]);

  const guestLabel = useMemo(() => {
    const total = guests[0] + guests[1];
    return total > 0 ? `${total} guest${total === 1 ? "" : "s"}` : "Add guests";
  }, [guests]);

  function search() {
    router.push(`/search?location=${encodeURIComponent(location)}&dates=${encodeURIComponent(dates)}&guests=${guests[0] + guests[1]}`);
  }

  function updateGuest(index: number, delta: number) {
    setGuests((current) => current.map((value, itemIndex) => (itemIndex === index ? Math.max(0, value + delta) : value)));
  }

  useEffect(() => {
    if (!panel) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setPanel(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [panel]);

  const activeShell = panel ? "border-transparent bg-[#ebebeb] shadow-[0_10px_32px_rgb(0_0_0_/_0.08)]" : "border bg-white shadow-[0_10px_30px_rgb(0_0_0_/_0.08)]";
  const activeSection = "bg-white shadow-[0_3px_16px_rgb(0_0_0_/_0.14)]";
  const inactiveSection = "active:bg-[#ebebeb] md:hover:bg-[#ebebeb]";

  return (
    <div ref={searchRef} className="relative z-[60] text-black">
      <div className={`relative z-[70] grid gap-0 overflow-hidden rounded-[1.75rem] transition md:grid-cols-[1.1fr_.8fr_.8fr_auto] md:rounded-full ${activeShell}`}>
        <button type="button" onClick={() => setPanel("where")} className={`relative min-h-16 border-b px-5 py-4 text-left transition md:rounded-full md:border-b-0 md:px-6 ${panel === "where" ? activeSection : inactiveSection}`}>
          <p className="text-xs font-semibold">Where</p>
          <p className="mt-1 truncate text-sm text-black/65">{location}</p>
        </button>
        <button type="button" onClick={() => setPanel("when")} className={`relative min-h-16 border-b px-5 py-4 text-left transition before:absolute before:left-0 before:top-1/2 before:hidden before:h-8 before:w-px before:-translate-y-1/2 before:bg-black/10 md:rounded-full md:border-b-0 md:px-6 md:before:block ${panel === "when" ? activeSection : inactiveSection} ${panel === "where" || panel === "when" ? "md:before:hidden" : ""}`}>
          <p className="text-xs font-semibold">When</p>
          <p className="mt-1 text-sm text-black/60">{dates}</p>
        </button>
        <button type="button" onClick={() => setPanel("who")} className={`relative min-h-16 px-5 py-4 text-left transition before:absolute before:left-0 before:top-1/2 before:hidden before:h-8 before:w-px before:-translate-y-1/2 before:bg-black/10 md:rounded-full md:px-6 md:before:block ${panel === "who" ? activeSection : inactiveSection} ${panel === "when" || panel === "who" ? "md:before:hidden" : ""}`}>
          <p className="text-xs font-semibold">Who</p>
          <p className="mt-1 text-sm text-black/60">{guestLabel}</p>
        </button>
        <button type="button" onClick={search} className="m-2 flex min-h-14 w-[calc(100%-1rem)] items-center justify-center justify-self-center rounded-full bg-[#083f35] px-5 text-base font-semibold text-white md:h-14 md:w-auto md:justify-self-end">
          <Search size={17} strokeWidth={3} />
          <span className="ml-2">Search</span>
        </button>
      </div>

      {panel && <button aria-label="Close search panel" onClick={() => setPanel(null)} className="fixed inset-0 z-[55] bg-transparent" />}

      {panel === "where" && (
        <div className="absolute left-0 top-[calc(100%+12px)] z-[80] max-h-[min(70vh,34rem)] w-[min(430px,calc(100vw-2rem))] overflow-auto rounded-[2rem] bg-white p-5 text-black shadow-[0_18px_50px_rgb(0_0_0_/_0.22)] md:p-6">
          <p className="text-sm text-black/55">Suggested destinations</p>
          <div className="mt-4 space-y-3">
            {destinations.map(({ name, description, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setLocation(name);
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
          </div>
        </div>
      )}

      {panel === "when" && (
        <div className="absolute left-1/2 top-[calc(100%+12px)] z-[80] max-h-[min(70vh,38rem)] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 overflow-auto rounded-[2rem] bg-white p-5 text-black shadow-[0_18px_50px_rgb(0_0_0_/_0.22)] md:max-h-none md:p-6">
          <div className="mx-auto mb-6 grid max-w-xs grid-cols-2 rounded-full bg-black/[0.05] p-1 text-sm">
            <button className="rounded-full bg-white py-2 font-semibold">Dates</button>
            <button className="rounded-full py-2">Flexible</button>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {["May 2026", "June 2026"].map((month) => (
              <div key={month}>
                <p className="mb-4 text-center text-lg font-semibold">{month}</p>
                <div className="grid grid-cols-7 gap-2 text-center text-sm">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                    <span key={`${month}-${day}`} className="text-black/55">
                      {day}
                    </span>
                  ))}
                  {Array.from({ length: 35 }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setDates("Jun 8 - Jun 13");
                        setPanel("who");
                      }}
                      className={`grid h-9 place-items-center rounded-full ${index === 14 || index === 19 ? "bg-[#083f35] text-white" : "active:bg-black/[0.06] md:hover:bg-black/[0.06]"}`}
                    >
                      {index < 4 ? "" : index - 3}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto">
            {["Exact dates", "+/- 1 day", "+/- 2 days", "+/- 3 days", "+/- 7 days", "+/- 14 days"].map((item) => (
              <button key={item} className="min-h-11 shrink-0 rounded-full border px-4 text-sm">
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === "who" && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[80] max-h-[min(70vh,32rem)] w-[min(430px,calc(100vw-2rem))] overflow-auto rounded-[2rem] bg-white p-5 text-black shadow-[0_18px_50px_rgb(0_0_0_/_0.22)]">
          <div className="space-y-5">
            {guestRows.map(([label, hint], index) => (
              <div key={label} className="flex items-center justify-between border-b pb-5 last:border-b-0 last:pb-0">
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-black/55">{hint}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => updateGuest(index, -1)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.05]">
                    <Minus size={16} />
                  </button>
                  <span>{guests[index]}</span>
                  <button type="button" onClick={() => updateGuest(index, 1)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.05] text-xl">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
