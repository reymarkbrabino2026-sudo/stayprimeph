import { describe, expect, it, vi } from "vitest";
import {
  getBlockedDateKeys,
  getBookedNightKeys,
  getNextAvailableStay,
  hasAvailabilityBlockConflict,
  hasBookedNightInRange,
} from "@/lib/availability-calendar";
import type { AvailabilityBlock } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
  createAvailabilityBlocksInDatabase: vi.fn(),
  deleteAvailabilityBlockInDatabase: vi.fn(),
  listAvailabilityBlocksFromDatabase: vi.fn(),
}));
vi.mock("@/lib/availability-store", () => ({
  readStoredAvailabilityBlocks: vi.fn(),
  writeStoredAvailabilityBlocks: vi.fn(),
}));

const block = {
  id: "block-1",
  propertyId: "property-1",
  date: "2026-06-21",
  reason: "booked_elsewhere",
  createdAt: "2026-06-14T00:00:00.000Z",
} satisfies AvailabilityBlock;

describe("availability helpers", () => {
  const bookedNightKeys = getBookedNightKeys([{ checkIn: "2026-06-04", checkOut: "2026-06-10" }]);
  const bookedNightSet = new Set(bookedNightKeys);

  it("marks booked nights without blocking the checkout day", () => {
    expect(bookedNightKeys).toContain("2026-06-04");
    expect(bookedNightKeys).toContain("2026-06-09");
    expect(bookedNightKeys).not.toContain("2026-06-10");
  });

  it("allows checkout on the first booked night", () => {
    expect(hasBookedNightInRange("2026-06-01", "2026-06-04", bookedNightSet)).toBe(false);
  });

  it("blocks stays that include another reservation night", () => {
    expect(hasBookedNightInRange("2026-06-03", "2026-06-05", bookedNightSet)).toBe(true);
  });

  it("repairs a selected stay to the next available window", () => {
    expect(
      getNextAvailableStay({
        fromDate: "2026-06-08",
        minDate: "2026-05-27",
        preferredNights: 5,
        bookedNightKeys: bookedNightSet,
      }),
    ).toEqual({ checkIn: "2026-06-10", checkOut: "2026-06-15" });
  });

  it("blocks each booked night but not the checkout day", () => {
    expect(getBlockedDateKeys("2026-06-20", "2026-06-23")).toEqual([
      "2026-06-20",
      "2026-06-21",
      "2026-06-22",
    ]);
  });

  it("detects conflicts with unavailable dates", () => {
    expect(hasAvailabilityBlockConflict([block], "property-1", "2026-06-20", "2026-06-22")).toBe(true);
    expect(hasAvailabilityBlockConflict([block], "property-1", "2026-06-22", "2026-06-24")).toBe(false);
  });

  it("ignores blocks from other listings", () => {
    expect(hasAvailabilityBlockConflict([block], "property-2", "2026-06-20", "2026-06-22")).toBe(false);
  });
});
