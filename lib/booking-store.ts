import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Booking } from "@/lib/types";

const storeFileName = "bookings.json";

export async function readStoredBookings(): Promise<Booking[]> {
  return readJsonStore<Booking>(storeFileName);
}

export async function writeStoredBookings(bookings: Booking[]) {
  await writeJsonStore(storeFileName, bookings);
}
