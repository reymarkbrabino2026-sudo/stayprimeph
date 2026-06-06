import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/geocode/route";

describe("GET /api/geocode", () => {
  it("rejects requests without an address query", async () => {
    const response = await GET(new Request("http://localhost:3000/api/geocode"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing address query." });
  });
});
