import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/geocode/route";
import { GET as reverseGET } from "@/app/api/geocode/reverse/route";

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
});

describe("GET /api/geocode/reverse", () => {
  it("rejects invalid coordinate values before calling the upstream service", async () => {
    const response = await reverseGET(new Request("http://localhost:3000/api/geocode/reverse?latitude=999&longitude=abc"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid coordinates." });
  });
});
