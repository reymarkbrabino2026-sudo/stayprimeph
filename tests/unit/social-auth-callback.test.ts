import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const { supabaseAuth } = vi.hoisted(() => ({
  supabaseAuth: {
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(),
  roleHome: vi.fn((role: string) => `/${role}/dashboard`),
  sessionMetadataFromHeaders: vi.fn(() => ({ userAgent: "Test Browser" })),
}));

vi.mock("@/lib/admin-mfa", () => ({
  createAdminMfaCode: vi.fn(() => "123456"),
  pendingAdminMfaCookie: vi.fn(() => ({
    name: "stayprimeph_admin_mfa",
    value: "signed-mfa-cookie",
    options: { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600 },
  })),
}));

vi.mock("@/lib/auth-tokens", () => ({
  issueAuthToken: vi.fn(async () => "mfa-token"),
}));

vi.mock("@/lib/email", () => ({
  sendPrivilegedMfaEmail: vi.fn(),
}));

vi.mock("@/lib/canonical-paths", () => ({
  normalizeKnownAppPath: vi.fn((path: string) => path),
}));

vi.mock("@/lib/repositories", () => ({
  createUserInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: supabaseAuth })),
  hasSupabaseConfig: vi.fn(() => true),
  isGoogleAuthEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(async () => []),
  writeStoredUsers: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUsers: vi.fn(async () => []),
}));

import { GET } from "@/app/auth/callback/route";
import { createSession } from "@/lib/auth";
import { issueAuthToken } from "@/lib/auth-tokens";
import { sendPrivilegedMfaEmail } from "@/lib/email";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { writeStoredUsers } from "@/lib/user-store";
import { getUsers } from "@/lib/users";

function callbackRequest(path: string) {
  const url = `https://stayprimeph.com${path}`;
  return { nextUrl: new URL(url), url } as unknown as NextRequest;
}

const supabaseUser = {
  id: "social-user-1",
  email: "host@example.com",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Host User" },
};

describe("social auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasSupabaseConfig).mockReturnValue(true);
    supabaseAuth.exchangeCodeForSession.mockResolvedValue({ error: null });
    supabaseAuth.getUser.mockResolvedValue({ data: { user: supabaseUser }, error: null });
  });

  it("creates a new Google or Facebook host account and requires host MFA", async () => {
    const response = await GET(callbackRequest("/auth/callback?code=oauth-code&mode=register&role=host"));

    expect(writeStoredUsers).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "supabase-social-user-1",
        email: "host@example.com",
        role: "host",
      }),
    ]);
    expect(createSession).not.toHaveBeenCalled();
    expect(issueAuthToken).toHaveBeenCalledWith("supabase-social-user-1", "admin_mfa");
    expect(sendPrivilegedMfaEmail).toHaveBeenCalledWith({
      to: "host@example.com",
      name: "Host User",
      code: "123456",
      role: "host",
    });
    expect(response.headers.get("location")).toBe("https://stayprimeph.com/login?mfa=1&role=host&message=Enter+the+6-digit+code+sent+to+the+host+email.");
    expect(response.headers.get("set-cookie")).toContain("stayprimeph_admin_mfa");
  });

  it("sends an existing guest who requested host access to the upgrade flow", async () => {
    const guestUser = {
      id: "guest-1",
      name: "Guest User",
      email: "host@example.com",
      role: "guest",
      avatar: "GU",
      phone: "",
      createdAt: "2026-06-23",
      emailVerifiedAt: "2026-06-23T00:00:00.000Z",
    } as const;

    vi.mocked(getUsers).mockResolvedValueOnce([guestUser]);
    const response = await GET(callbackRequest("/auth/callback?code=oauth-code&mode=register&role=host"));

    expect(writeStoredUsers).not.toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith("guest-1", expect.objectContaining({ userAgent: "Test Browser" }));
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://stayprimeph.com/become-a-host/upgrade");
  });

  it("returns host signup OAuth errors to the host register page", async () => {
    vi.mocked(hasSupabaseConfig).mockReturnValueOnce(false);

    const response = await GET(callbackRequest("/auth/callback?mode=register&role=host"));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("https://stayprimeph.com/register?");
    expect(location).toContain("role=host");
    expect(location).toContain("Social+login+is+not+configured+correctly");
  });
});
