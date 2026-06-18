import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://stayprimeph.com",
  },
}));

import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";

function requestHeaders(values: Record<string, string>) {
  return new Headers(values);
}

describe("trusted request origin validation", () => {
  afterEach(() => {
    delete process.env.VERCEL_URL;
  });

  it("accepts same-origin browser requests for the canonical app host", () => {
    const headers = requestHeaders({
      host: "stayprimeph.com",
      origin: "https://stayprimeph.com",
    });

    expect(isTrustedRequestOrigin(headers)).toBe(true);
  });

  it("accepts requests without Origin only when the Host is trusted", () => {
    const headers = requestHeaders({ host: "stayprimeph.com" });

    expect(isTrustedRequestOrigin(headers)).toBe(true);
  });

  it("rejects requests with an untrusted Host header", () => {
    const headers = requestHeaders({
      host: "evil.example",
      origin: "https://stayprimeph.com",
    });

    expect(isTrustedRequestOrigin(headers)).toBe(false);
  });

  it("rejects cross-site browser origins even when the Host is trusted", () => {
    const headers = requestHeaders({
      host: "stayprimeph.com",
      origin: "https://evil.example",
    });

    expect(isTrustedRequestOrigin(headers)).toBe(false);
  });

  it("accepts the active Vercel deployment host when VERCEL_URL is set", () => {
    process.env.VERCEL_URL = "stayprimeph-preview.vercel.app";
    const headers = requestHeaders({
      host: "stayprimeph-preview.vercel.app",
      origin: "https://stayprimeph-preview.vercel.app",
    });

    expect(isTrustedRequestOrigin(headers)).toBe(true);
  });

  it("uses a generic rejection message", () => {
    expect(untrustedRequestMessage).toBe("Request origin could not be verified.");
  });
});
