import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type EmailSend = (payload: { html: string; subject: string; attachments?: Array<{ filename?: string; content?: Buffer; contentType?: string }> }) => Promise<{ error: null }>;

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

import { sendPaymentReceiptEmail, sendPrivilegedMfaEmail, sendVerificationEmail } from "@/lib/email";

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

  it("renders a StayPrimePH receipt email with paid amount and receipt details", async () => {
    await sendPaymentReceiptEmail({
      to: "guest@example.com",
      propertyTitle: "Caya Villa",
      propertyLocation: "Tagaytay, Philippines",
      propertyAddress: "123 Prime Street",
      checkIn: "2026-07-10",
      checkOut: "2026-07-12",
      guests: 2,
      totalPrice: 6000,
      bookingId: "booking-1",
      bookingPackageName: "Overnight Full Access",
      actionUrl: "https://stayprimeph.test/guest/bookings/booking-1",
      amountPaid: 6000,
      paidAt: "2026-06-29T06:30:00.000Z",
      paymentMethod: "gcash",
      paymentStatus: "paid",
      transactionId: "GCASH-REF-12345",
      receiptNumber: "BOOK-ING1",
      invoiceNumber: "SPH-BOOK-ING1",
    });

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    const payload = emailSendMock.mock.calls[0][0];

    expect(payload.subject).toBe("Your receipt from StayPrimePH #BOOK-ING1");
    expect(payload.html).toContain("Receipt from StayPrimePH");
    expect(payload.html).toContain("₱6,000");
    expect(payload.html).toContain("Receipt #BOOK-ING1");
    expect(payload.html).toContain("SPH-BOOK-ING1");
    expect(payload.html).toContain("GCash");
    expect(payload.html).toContain("Overnight Full Access");
    expect(payload.attachments).toHaveLength(2);
    expect(payload.attachments?.[0]).toMatchObject({
      filename: "Receipt-BOOK-ING1.pdf",
      contentType: "application/pdf",
    });
    expect(payload.attachments?.[1]).toMatchObject({
      filename: "Invoice-SPH-BOOK-ING1.pdf",
      contentType: "application/pdf",
    });
    expect(payload.attachments?.[0].content?.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(payload.attachments?.[1].content?.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
