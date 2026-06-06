export type AvailabilityBlock = {
  checkIn: string;
  checkOut: string;
};

export function getBookedNightKeys(blocks: AvailabilityBlock[]) {
  const keys = new Set<string>();

  for (const block of blocks) {
    const current = parseDateKey(block.checkIn);
    const checkOut = parseDateKey(block.checkOut);

    while (current.getTime() < checkOut.getTime()) {
      keys.add(toDateKey(current));
      current.setDate(current.getDate() + 1);
    }
  }

  return [...keys].sort();
}

export function hasBookedNightInRange(checkIn: string, checkOut: string, bookedNightKeys: Set<string>) {
  const current = parseDateKey(checkIn);
  const end = parseDateKey(checkOut);

  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime()) || end <= current) return false;

  while (current.getTime() < end.getTime()) {
    if (bookedNightKeys.has(toDateKey(current))) return true;
    current.setDate(current.getDate() + 1);
  }

  return false;
}

export function getNextAvailableStay({
  fromDate,
  bookedNightKeys,
  minDate,
  preferredNights = 1,
  maxSearchDays = 730,
}: {
  fromDate: string;
  bookedNightKeys: Set<string>;
  minDate: string;
  preferredNights?: number;
  maxSearchDays?: number;
}) {
  const nights = Math.max(1, preferredNights);
  let checkIn = fromDate < minDate ? minDate : fromDate;

  for (let offset = 0; offset <= maxSearchDays; offset += 1) {
    const checkOut = addDays(checkIn, nights);
    if (!bookedNightKeys.has(checkIn) && !hasBookedNightInRange(checkIn, checkOut, bookedNightKeys)) {
      return { checkIn, checkOut };
    }

    checkIn = addDays(checkIn, 1);
  }

  return null;
}

export function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

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
