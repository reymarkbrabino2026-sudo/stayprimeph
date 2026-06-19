import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/geocode/route";
import { GET as reverseGET } from "@/app/api/geocode/reverse/route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/geocode", () => {
  it("rejects requests without an address query", async () => {
    const response = await GET(new Request("http://localhost:3000/api/geocode"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing address query." });
  });

  it("rejects oversized address queries before calling the upstream service", async () => {
    const response = await GET(new Request(`http://localhost:3000/api/geocode?query=${"a".repeat(201)}`));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Address query is too long." });
  });

  it("returns a safe error when the upstream service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    const response = await GET(new Request("http://localhost:3000/api/geocode?query=Makati"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Geocoding service unavailable." });
  });
});

describe("GET /api/geocode/reverse", () => {
  it("rejects invalid coordinate values before calling the upstream service", async () => {
    const response = await reverseGET(new Request("http://localhost:3000/api/geocode/reverse?latitude=999&longitude=abc"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid coordinates." });
  });

  it("returns a safe error when the reverse upstream response is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 200 })));

    const response = await reverseGET(new Request("http://localhost:3000/api/geocode/reverse?latitude=14.55&longitude=121.03"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Reverse geocoding service unavailable." });
  });
});
