import { describe, expect, it } from "vitest";
import { getBookedNightKeys, getNextAvailableStay, hasBookedNightInRange } from "@/lib/availability";

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
});
