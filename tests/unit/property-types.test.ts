import { describe, expect, it } from "vitest";
import { getPropertyTypeIconName, getPropertyTypeId, getPropertyTypeLabel, propertyTypeMatches } from "@/lib/property-types";

describe("property type helpers", () => {
  it("normalizes private resort values for forms and public display", () => {
    expect(getPropertyTypeId("Private Resort")).toBe("private-resort");
    expect(getPropertyTypeLabel("private-resort")).toBe("Private Resort");
    expect(getPropertyTypeIconName("Private Resort")).toBe("palmtree");
  });

  it("keeps resort search filters compatible with private resort listings", () => {
    expect(propertyTypeMatches("private-resort", "resort")).toBe(true);
    expect(propertyTypeMatches("resort", "private-resort")).toBe(true);
  });
});
