import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type EmailSend = (payload: { html: string; subject: string }) => Promise<{ error: null }>;

const { emailSendMock } = vi.hoisted(() => ({
  emailSendMock: vi.fn<EmailSend>(async () => ({ error: null })),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(function MockResend() {
    return {
      emails: {
        send: emailSendMock,
      },
    };
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    EMAIL_FROM: "StayPrimePH <noreply@stayprimeph.test>",
    NEXT_PUBLIC_APP_URL: "https://stayprimeph.test",
    RESEND_API_KEY: "test-resend-key",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/notification-consent", () => ({
  isNotificationEmailAllowed: vi.fn(async () => true),
}));

import { sendPrivilegedMfaEmail, sendVerificationEmail } from "@/lib/email";

describe("transactional email rendering", () => {
  beforeEach(() => {
    emailSendMock.mockClear();
  });

  it("highlights the privileged MFA code in the email body", async () => {
    await sendPrivilegedMfaEmail({
      to: "admin@example.com",
      name: "StayPrimePH Admin",
      code: "745575",
      role: "admin",
    });

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    const payload = emailSendMock.mock.calls[0][0];

    expect(payload.subject).toBe("Your StayPrimePH admin sign-in code");
    expect(payload.html).toContain("Admin sign-in code");
    expect(payload.html).toContain("background:#eef8f5");
    expect(payload.html).toContain("font-family:'Courier New',Courier,monospace");
    expect(payload.html).toContain(">745575</span>");
  });

  it("highlights the email verification code and escapes dynamic values", async () => {
    await sendVerificationEmail({
      to: "guest@example.com",
      name: "<Guest>",
      token: "verify-token",
      code: "112233",
    });

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    const payload = emailSendMock.mock.calls[0][0];

    expect(payload.html).toContain("&lt;Guest&gt;");
    expect(payload.html).toContain("background:#eef8f5");
    expect(payload.html).toContain(">112233</span>");
  });
});
