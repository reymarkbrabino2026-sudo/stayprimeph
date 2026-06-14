import { describe, expect, it } from "vitest";
import { formatPropertyLocation, formatSearchLocationLabel } from "@/lib/property-location";

describe("property location labels", () => {
  it("shows only the city when a province is present", () => {
    expect(
      formatPropertyLocation({
        city: "Quezon City",
        province: "Bataan",
        country: "Philippines",
      }),
    ).toBe("Quezon City");
  });

  it("falls back to the country when the city is missing", () => {
    expect(formatPropertyLocation({ city: "", province: "Bataan", country: "Philippines" })).toBe("Philippines");
  });

  it("removes province and country from comma-separated search labels", () => {
    expect(formatSearchLocationLabel("Quezon City, Bataan, Philippines")).toBe("Quezon City");
  });
});
