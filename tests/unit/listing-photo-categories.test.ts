import { describe, expect, test } from "vitest";
import { classifyListingPhotoFromFileName, listingPhotoCategoryLabel, normalizeListingPhotoCategory } from "@/lib/listing-photo-categories";

describe("listing photo categories", () => {
  test("normalizes common room category aliases", () => {
    expect(normalizeListingPhotoCategory("bedrooms")).toBe("bedroom");
    expect(normalizeListingPhotoCategory("living area")).toBe("living_room");
    expect(normalizeListingPhotoCategory("bath room")).toBe("bathroom");
    expect(normalizeListingPhotoCategory("not-a-room")).toBe("other");
  });

  test("classifies obvious upload filenames as a fallback", () => {
    expect(classifyListingPhotoFromFileName("bright-kitchen-counter.webp")).toBe("kitchen");
    expect(classifyListingPhotoFromFileName("master-bedroom-01.jpg")).toBe("bedroom");
    expect(classifyListingPhotoFromFileName("pool-and-patio.avif")).toBe("pool");
  });

  test("returns friendly labels for category badges", () => {
    expect(listingPhotoCategoryLabel("dining_room")).toBe("Dining Area");
    expect(listingPhotoCategoryLabel("unknown")).toBe("Other Photos");
  });
});
