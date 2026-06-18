import { afterEach, describe, expect, test, vi } from "vitest";
import { allowedCorsOrigin, configuredCorsOrigins, corsHeaders } from "@/lib/cors";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
});

describe("API CORS policy", () => {
  test("denies cross-origin API access by default", () => {
    delete process.env.API_CORS_ALLOWED_ORIGINS;

    expect(configuredCorsOrigins()).toEqual(new Set());
    expect(allowedCorsOrigin("https://partner.example")).toBeNull();
    expect(corsHeaders("https://partner.example")).toBeNull();
  });

  test("allows only explicitly configured origins", () => {
    process.env.API_CORS_ALLOWED_ORIGINS = "https://partner.example, https://dashboard.example/path";

    expect(allowedCorsOrigin("https://partner.example")).toBe("https://partner.example");
    expect(allowedCorsOrigin("https://dashboard.example")).toBe("https://dashboard.example");
    expect(allowedCorsOrigin("https://attacker.example")).toBeNull();
  });

  test("does not allow wildcard origins", () => {
    process.env.API_CORS_ALLOWED_ORIGINS = "*, https://partner.example";

    expect(allowedCorsOrigin("https://attacker.example")).toBeNull();
    expect(allowedCorsOrigin("https://partner.example")).toBe("https://partner.example");
  });

  test("rejects HTTP origins in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.API_CORS_ALLOWED_ORIGINS = "http://partner.example, https://partner.example";

    expect(allowedCorsOrigin("http://partner.example")).toBeNull();
    expect(allowedCorsOrigin("https://partner.example")).toBe("https://partner.example");
  });

  test("returns explicit preflight headers without credentialed wildcard CORS", () => {
    process.env.API_CORS_ALLOWED_ORIGINS = "https://partner.example";

    expect(corsHeaders("https://partner.example")).toEqual({
      "Access-Control-Allow-Origin": "https://partner.example",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
  });
});
