import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  headerStore: new Headers(),
  cookieStore: {
    get: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => state.headerStore),
  cookies: vi.fn(async () => state.cookieStore),
}));

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
    NEXT_PUBLIC_APP_URL: "https://stayprimeph.test",
  },
}));

import { requireStateChangingApiRequest } from "@/lib/api-request-guard";
import { csrfHeaderName } from "@/lib/csrf-fields";
import { invalidCsrfMessage } from "@/lib/csrf";
import { untrustedRequestMessage } from "@/lib/request-safety";

function csrfToken(sessionToken = "session-token-1") {
  return createHmac("sha256", "test-auth-secret-with-at-least-32-characters")
    .update(`csrf:${sessionToken}`)
    .digest("base64url");
}

function postRequest(headers?: HeadersInit) {
  return new Request("https://stayprimeph.test/api/uploads/avatar", {
    method: "POST",
    headers,
  });
}

describe("state-changing API request guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.headerStore = new Headers({
      host: "stayprimeph.test",
      origin: "https://stayprimeph.test",
    });
    state.cookieStore.get.mockReturnValue({ value: "session-token-1" });
  });

  it("accepts a trusted origin with a matching CSRF header", async () => {
    const result = await requireStateChangingApiRequest(postRequest({
      [csrfHeaderName]: csrfToken(),
    }));

    expect(result.ok).toBe(true);
  });

  it("rejects cross-origin requests before route-specific mutations run", async () => {
    state.headerStore = new Headers({
      host: "stayprimeph.test",
      origin: "https://evil.example",
    });

    const result = await requireStateChangingApiRequest(postRequest({
      [csrfHeaderName]: csrfToken(),
    }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({ error: untrustedRequestMessage });
    }
  });

  it("rejects trusted-origin requests without the CSRF header", async () => {
    const result = await requireStateChangingApiRequest(postRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({ error: invalidCsrfMessage });
    }
  });
});
