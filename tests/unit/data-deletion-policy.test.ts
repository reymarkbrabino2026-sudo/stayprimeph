import { describe, expect, it } from "vitest";
import { legalPageMap } from "@/lib/legal-data";

describe("data deletion policy", () => {
  it("publishes the deletion SLA and admin review workflow", () => {
    const page = legalPageMap["data-deletion"];
    const text = [
      page.description,
      page.updatedAt,
      ...page.sections.flatMap((section) => [section.title, ...section.body]),
    ].join("\n");

    expect(text).toContain("30 days after user verification");
    expect(text).toContain("account deletion queue");
    expect(text).toContain("awaiting verification");
    expect(text).toContain("ready for review");
    expect(text).toContain("past the 30-day service target");
    expect(text).toContain("active bookings");
    expect(text).toContain("legal holds");
  });
});
