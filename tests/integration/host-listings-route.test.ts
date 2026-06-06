import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/host-listings/route";

describe("GET /api/host-listings", () => {
  it("returns wizard configuration", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.steps.length).toBeGreaterThan(0);
    expect(body.propertyTypes.some((item: { id: string }) => item.id === "house")).toBe(true);
  });
});
