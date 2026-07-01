import { parseDateKey } from "@/lib/availability-calendar";

export function packageAvailableDaySet(availableDays?: number[] | null) {
  const days = Array.from(new Set((availableDays ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
  return days.length && days.length < 7 ? new Set(days) : null;
}

export function dateMatchesPackageDays(dateKey: string, availableDaySet: Set<number> | null) {
  if (!availableDaySet) return true;

  const date = parseDateKey(dateKey);
  if (Number.isNaN(date.getTime())) return false;

  return availableDaySet.has(date.getDay());
}
