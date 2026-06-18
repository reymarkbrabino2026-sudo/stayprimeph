import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

vi.mock("server-only", () => ({}));

const { eventState, stripeConstructEvent } = vi.hoisted(() => ({
  eventState: {
    event: null as unknown,
  },
  stripeConstructEvent: vi.fn(() => eventState.event),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "stripe-signature": "valid-signature" })),
}));

vi.mock("@/lib/env", () => ({
  env: {
    PAYMENT_LAUNCH_MODE: "stripe",
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/payments", () => ({
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: stripeConstructEvent,
    },
  })),
  isStripeCheckoutEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/bookings", () => ({
  getBookingById: vi.fn(),
  markBookingPaid: vi.fn(),
}));

import { POST } from "@/app/api/payments/webhook/route";
import { getBookingById, markBookingPaid } from "@/lib/bookings";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-01",
  checkOut: "2026-07-03",
  guests: 2,
  totalPrice: 5000,
  status: "pending",
  paymentStatus: "pending",
  createdAt: "2026-06-18",
} satisfies Booking;

function checkoutCompletedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_123",
    amount_total: booking.totalPrice * 100,
    currency: "php",
    metadata: { bookingId: booking.id },
    payment_intent: "pi_test_123",
    payment_status: "paid",
    ...overrides,
  };
}

function setCheckoutCompleted(overrides: Record<string, unknown> = {}) {
  eventState.event = {
    type: "checkout.session.completed",
    data: {
      object: checkoutCompletedSession(overrides),
    },
  };
}

async function postWebhook() {
  return POST(new Request("https://stayprimeph.test/api/payments/webhook", {
    method: "POST",
    body: "{}",
  }));
}

describe("Stripe payment webhook validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCheckoutCompleted();
    vi.mocked(getBookingById).mockResolvedValue(booking);
  });

  it("marks the booking paid only after validating booking, currency, amount, and provider transaction ID", async () => {
    const response = await postWebhook();

    await expect(response.json()).resolves.toEqual({ received: true });
    expect(response.status).toBe(200);
    expect(markBookingPaid).toHaveBeenCalledWith(booking.id, "pi_test_123");
  });

  it("rejects missing or invalid booking metadata", async () => {
    setCheckoutCompleted({ metadata: {} });

    const response = await postWebhook();

    await expect(response.json()).resolves.toEqual({ error: "Invalid booking metadata." });
    expect(response.status).toBe(400);
    expect(markBookingPaid).not.toHaveBeenCalled();
  });

  it("rejects currency mismatches", async () => {
    setCheckoutCompleted({ currency: "usd" });

    const response = await postWebhook();

    await expect(response.json()).resolves.toEqual({ error: "Checkout currency mismatch." });
    expect(response.status).toBe(400);
    expect(markBookingPaid).not.toHaveBeenCalled();
  });

  it("rejects amount mismatches", async () => {
    setCheckoutCompleted({ amount_total: booking.totalPrice * 100 - 1 });

    const response = await postWebhook();

    await expect(response.json()).resolves.toEqual({ error: "Checkout amount mismatch." });
    expect(response.status).toBe(400);
    expect(markBookingPaid).not.toHaveBeenCalled();
  });

  it("rejects missing provider transaction IDs", async () => {
    setCheckoutCompleted({ payment_intent: null });

    const response = await postWebhook();

    await expect(response.json()).resolves.toEqual({ error: "Missing provider transaction ID." });
    expect(response.status).toBe(400);
    expect(markBookingPaid).not.toHaveBeenCalled();
  });
});
