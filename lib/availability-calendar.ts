import type { AvailabilityBlock, Booking } from "@/lib/types";

export type UnavailableStay = AvailabilityBlock | Pick<Booking, "checkIn" | "checkOut">;

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function getBlockedDateKeys(checkIn: string, checkOut: string) {
  const dateKeys: string[] = [];
  const current = parseDateKey(checkIn);
  const checkout = parseDateKey(checkOut);

  while (current.getTime() < checkout.getTime()) {
    dateKeys.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dateKeys;
}

export function getBookedNightKeys(unavailableStays: UnavailableStay[]) {
  const dateKeys = unavailableStays.flatMap((stay) => {
    if ("date" in stay) return [stay.date];
    return getBlockedDateKeys(stay.checkIn, stay.checkOut);
  });

  return [...new Set(dateKeys)].sort();
}

export function hasBookedNightInRange(checkIn: string, checkOut: string, bookedNightKeys: Set<string>) {
  const start = parseDateKey(checkIn);
  const end = parseDateKey(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return false;

  return getBlockedDateKeys(checkIn, checkOut).some((dateKey) => bookedNightKeys.has(dateKey));
}

export function hasAvailabilityBlockConflict(blocks: AvailabilityBlock[], propertyId: string, checkIn: string, checkOut: string) {
  const requestedDates = new Set(getBlockedDateKeys(checkIn, checkOut));
  return blocks.some((block) => block.propertyId === propertyId && requestedDates.has(block.date));
}

export function getNextAvailableStay({
  fromDate,
  minDate,
  bookedNightKeys,
  preferredNights = 1,
  maxSearchDays = 730,
}: {
  fromDate: string;
  minDate: string;
  bookedNightKeys: Set<string>;
  preferredNights?: number;
  maxSearchDays?: number;
}) {
  let checkIn = fromDate > minDate ? fromDate : minDate;
  const nights = Math.max(preferredNights, 1);

  for (let attempts = 0; attempts <= maxSearchDays; attempts += 1) {
    const checkOut = addDays(checkIn, nights);
    if (!bookedNightKeys.has(checkIn) && !hasBookedNightInRange(checkIn, checkOut, bookedNightKeys)) {
      return { checkIn, checkOut };
    }
    checkIn = addDays(checkIn, 1);
  }

  return null;
}
