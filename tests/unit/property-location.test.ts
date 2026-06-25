import { describe, expect, it } from "vitest";
import {
  formatPropertyLocation,
  formatSearchLocationLabel,
  normalizePropertyLocationSearchQuery,
  propertyMatchesLocationSearch,
} from "@/lib/property-location";

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

  it("normalizes Sta. abbreviations for city matching", () => {
    expect(normalizePropertyLocationSearchQuery("Sta. Maria, Philippines")).toBe("santa maria");
  });

  it("matches structured city and barangay fields accurately", () => {
    const listing = {
      address: "123 Prime Street",
      barangay: "Mamacao",
      city: "Sta Maria",
      province: "Davao Occidental",
      zipCode: "8011",
      country: "Philippines",
    };

    expect(propertyMatchesLocationSearch(listing, "Santa Maria")).toBe(true);
    expect(propertyMatchesLocationSearch(listing, "Mamacao")).toBe(true);
    expect(propertyMatchesLocationSearch(listing, "Davao City")).toBe(false);
  });

  it("does not match Manila just because a listing is in Metro Manila", () => {
    const listing = {
      address: "Commonwealth Avenue",
      barangay: "Batasan Hills",
      city: "Quezon City",
      province: "Metro Manila",
      zipCode: "1126",
      country: "Philippines",
    };

    expect(propertyMatchesLocationSearch(listing, "Quezon City")).toBe(true);
    expect(propertyMatchesLocationSearch(listing, "Manila")).toBe(false);
  });
});
