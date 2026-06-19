import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));
const { envState } = vi.hoisted(() => ({
  envState: {
    env: {
      PAYMENT_LAUNCH_MODE: "disabled" as "disabled" | "stripe",
      STRIPE_SECRET_KEY: undefined as string | undefined,
      STRIPE_WEBHOOK_SECRET: undefined as string | undefined,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: undefined as string | undefined,
    },
  },
}));
vi.mock("@/lib/env", () => envState);
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
  listPaymentsFromDatabase: vi.fn(),
  recordManualPaymentInDatabase: vi.fn(),
  confirmManualPaymentInDatabase: vi.fn(),
  rejectManualPaymentInDatabase: vi.fn(),
}));
vi.mock("@/lib/payment-store", () => ({
  readStoredPayments: vi.fn(async () => []),
  writeStoredPayments: vi.fn(),
}));
vi.mock("@/lib/platform-ledger-store", () => ({
  readStoredPlatformLedger: vi.fn(async () => []),
  writeStoredPlatformLedger: vi.fn(),
}));
vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(async () => []),
  writeStoredBookings: vi.fn(),
}));

import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { appendAuditLog } from "@/lib/audit-logs";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { writeStoredPlatformLedger } from "@/lib/platform-ledger-store";
import { arePaidBookingsEnabled, confirmManualPayment, isStripeCheckoutEnabled, submitManualPayment, verifySubmittedPaymentByAdmin } from "@/lib/payments";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-06-10",
  checkOut: "2026-06-12",
  guests: 2,
  totalPrice: 5000,
  status: "pending",
  paymentStatus: "pending",
  createdAt: "2026-06-01",
} satisfies Booking;

describe("submitManualPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.env.PAYMENT_LAUNCH_MODE = "disabled";
    envState.env.STRIPE_SECRET_KEY = undefined;
    envState.env.STRIPE_WEBHOOK_SECRET = undefined;
    envState.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = undefined;
  });

  it("records manual payment details for platform verification", async () => {
    vi.mocked(readStoredBookings).mockResolvedValueOnce([booking]);

    await submitManualPayment({
      guestId: "guest-1",
      booking,
      paymentInput: {
        bookingId: booking.id,
        paymentMethod: "gcash",
        amount: booking.totalPrice,
        transactionId: "reference",
        notes: undefined,
      },
    });

    expect(writeStoredPayments).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        paymentMethod: "gcash",
        paymentStatus: "submitted",
        transactionId: "reference",
      }),
    ]);
    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({
        id: booking.id,
        status: "pending",
        paymentStatus: "submitted",
      }),
    ]);
  });
});

describe("payment launch mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.env.PAYMENT_LAUNCH_MODE = "disabled";
    envState.env.STRIPE_SECRET_KEY = undefined;
    envState.env.STRIPE_WEBHOOK_SECRET = undefined;
    envState.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = undefined;
  });

  it("keeps paid bookings disabled unless Stripe mode has all provider secrets", () => {
    expect(arePaidBookingsEnabled()).toBe(false);
    expect(isStripeCheckoutEnabled()).toBe(false);

    envState.env.PAYMENT_LAUNCH_MODE = "stripe";
    envState.env.STRIPE_SECRET_KEY = "sk_live_test";
    expect(arePaidBookingsEnabled()).toBe(false);
    expect(isStripeCheckoutEnabled()).toBe(false);

    envState.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    envState.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_test";
    expect(arePaidBookingsEnabled()).toBe(true);
    expect(isStripeCheckoutEnabled()).toBe(true);
  });
});

describe("confirmManualPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects manual payment confirmation while paid bookings are disabled", async () => {
    vi.mocked(readStoredPayments).mockResolvedValueOnce([
      {
        id: "payment-booking-1",
        bookingId: booking.id,
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "gcash",
        paymentStatus: "submitted",
        transactionId: "gcash-reference",
        createdAt: "2026-06-01",
      },
    ]);
    vi.mocked(readStoredBookings).mockResolvedValueOnce([booking]);

    await expect(confirmManualPayment({ booking, hostId: booking.hostId })).rejects.toThrow("Only platform admins can verify submitted payments.");

    expect(readStoredPayments).not.toHaveBeenCalled();
    expect(readStoredBookings).not.toHaveBeenCalled();
    expect(writeStoredPayments).not.toHaveBeenCalled();
    expect(writeStoredBookings).not.toHaveBeenCalled();
  });
});

describe("verifySubmittedPaymentByAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets an admin mark a submitted payment as paid and records platform ledger", async () => {
    vi.mocked(readStoredPayments).mockResolvedValue([
      {
        id: "payment-booking-1",
        bookingId: booking.id,
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "gcash",
        paymentStatus: "submitted",
        transactionId: "gcash-reference",
        createdAt: "2026-06-01",
      },
    ]);
    vi.mocked(readStoredBookings).mockResolvedValue([booking]);

    await verifySubmittedPaymentByAdmin({ booking, adminId: "admin-1" });

    expect(writeStoredPayments).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        paymentStatus: "paid",
        confirmedBy: "admin-1",
      }),
    ]);
    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({
        id: booking.id,
        status: "confirmed",
        paymentStatus: "paid",
      }),
    ]);
    expect(writeStoredPlatformLedger).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        amount: 833,
        source: "manual_payment",
        destination: "stayprime_bank",
        status: "banked",
      }),
    ]);
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      actorRole: "admin",
      action: "payment.approved",
      entityType: "payment",
    }));
  });

  it("logs submitted payment rejections", async () => {
    vi.mocked(readStoredPayments).mockResolvedValue([
      {
        id: "payment-booking-1",
        bookingId: booking.id,
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "gcash",
        paymentStatus: "submitted",
        transactionId: "gcash-reference",
        createdAt: "2026-06-01",
      },
    ]);
    vi.mocked(readStoredBookings).mockResolvedValue([booking]);

    const { rejectSubmittedPaymentByAdmin } = await import("@/lib/payments");
    await rejectSubmittedPaymentByAdmin({ booking, adminId: "admin-1", rejectionReason: "Reference not found" });

    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      actorRole: "admin",
      action: "payment.rejected",
      entityType: "payment",
      entityId: "payment-booking-1",
      metadata: expect.objectContaining({ reason: "Reference not found" }),
    }));
  });

  it("rejects admin verification when another booking already uses the same payment reference", async () => {
    vi.mocked(readStoredPayments).mockResolvedValue([
      {
        id: "payment-booking-1",
        bookingId: booking.id,
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "gcash",
        paymentStatus: "submitted",
        transactionId: "gcash-reference",
        createdAt: "2026-06-01",
      },
      {
        id: "payment-booking-2",
        bookingId: "booking-2",
        guestId: "guest-2",
        hostId: booking.hostId,
        amount: 4500,
        paymentMethod: "gcash",
        paymentStatus: "paid",
        transactionId: "gcash-reference",
        createdAt: "2026-06-01",
      },
    ]);
    vi.mocked(readStoredBookings).mockResolvedValue([booking]);

    await expect(verifySubmittedPaymentByAdmin({ booking, adminId: "admin-1" })).rejects.toThrow("Payment reference has already been used.");

    expect(writeStoredPayments).not.toHaveBeenCalled();
    expect(writeStoredBookings).not.toHaveBeenCalled();
    expect(writeStoredPlatformLedger).not.toHaveBeenCalled();
  });
});
