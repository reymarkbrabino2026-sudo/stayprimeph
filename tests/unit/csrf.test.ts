import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
  },
}));

import { assertValidCsrfForm, assertValidCsrfToken, csrfFieldName, getCsrfToken, invalidCsrfMessage } from "@/lib/csrf";

describe("CSRF token helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty token when there is no authenticated session cookie", async () => {
    cookieStore.get.mockReturnValueOnce(undefined);

    await expect(getCsrfToken()).resolves.toBe("");
  });

  it("accepts the token derived from the current session cookie", async () => {
    cookieStore.get.mockReturnValue({ value: "session-token-1" });

    const token = await getCsrfToken();
    await expect(assertValidCsrfToken(token)).resolves.toBeUndefined();

    const formData = new FormData();
    formData.set(csrfFieldName, token);
    await expect(assertValidCsrfForm(formData)).resolves.toBeUndefined();
  });

  it("rejects missing or mismatched tokens", async () => {
    cookieStore.get.mockReturnValue({ value: "session-token-1" });

    await expect(assertValidCsrfToken(null)).rejects.toThrow(invalidCsrfMessage);
    await expect(assertValidCsrfToken("wrong-token")).rejects.toThrow(invalidCsrfMessage);
  });
});
