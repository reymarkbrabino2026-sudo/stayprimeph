import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/bookings", () => ({
  getBookingsForHost: vi.fn(),
}));

vi.mock("@/lib/payments", () => ({
  getPaymentsForHost: vi.fn(),
}));

vi.mock("@/lib/payout-store", () => ({
  readStoredPayouts: vi.fn(),
  writeStoredPayouts: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({
  createPayoutInDatabase: vi.fn(),
  getAllPayoutsFromDatabase: vi.fn(),
  getPayoutsForHostFromDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/users", () => ({
  getUsers: vi.fn(),
}));

import { getBookingsForHost } from "@/lib/bookings";
import { getPaymentsForHost } from "@/lib/payments";
import { readStoredPayouts, writeStoredPayouts } from "@/lib/payout-store";
import { getHostEarningsSummary, getHostPayoutQueue, payoutAvailableOn, payoutTargetBy, recordHostPayout } from "@/lib/payouts";
import { getUsers } from "@/lib/users";
import type { Booking, Payment, Payout, User } from "@/lib/types";

const paidBooking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-10",
  checkOut: "2026-07-12",
  guests: 2,
  totalPrice: 12000,
  status: "confirmed",
  paymentStatus: "paid",
  createdAt: "2026-06-20T00:00:00.000Z",
} satisfies Booking;

const paidPayment = {
  id: "payment-1",
  bookingId: "booking-1",
  guestId: "guest-1",
  hostId: "host-1",
  amount: 12000,
  paymentMethod: "gcash",
  paymentStatus: "paid",
  transactionId: "GCASH-1",
  submittedAt: "2026-06-24T08:00:00.000Z",
  confirmedAt: "2026-06-24T09:00:00.000Z",
  createdAt: "2026-06-24T08:00:00.000Z",
  updatedAt: "2026-06-24T09:00:00.000Z",
} satisfies Payment;

const hostUser = {
  id: "host-1",
  name: "Host User",
  email: "host@example.com",
  role: "host",
  avatar: "HU",
  phone: "",
  createdAt: "2026-06-01",
} satisfies User;

describe("transaction payout policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-06-25T10:00:00.000Z"));
    vi.mocked(getBookingsForHost).mockResolvedValue([paidBooking]);
    vi.mocked(getPaymentsForHost).mockResolvedValue([paidPayment]);
    vi.mocked(readStoredPayouts).mockResolvedValue([]);
    vi.mocked(getUsers).mockResolvedValue([hostUser]);
  });

  it("makes payouts available after payment confirmation, with 24 hours as the target deadline", () => {
    expect(payoutAvailableOn(paidBooking, paidPayment).toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(payoutTargetBy(paidBooking, paidPayment).toISOString()).toBe("2026-06-25T09:00:00.000Z");
  });

  it("summarizes host earnings from paid transactions with StayPrimePH markup removed", async () => {
    const summary = await getHostEarningsSummary("host-1");

    expect(summary.lifetimeEarnings).toBe(10000);
    expect(summary.availableBalance).toBe(10000);
    expect(summary.pendingClearance).toBe(0);
    expect(summary.totalPaidOut).toBe(0);
  });

  it("queues each unpaid booking transaction separately", async () => {
    const queue = await getHostPayoutQueue();

    expect(queue).toEqual([
      expect.objectContaining({
        host: { id: "host-1", name: "Host User", email: "host@example.com" },
        bookingId: "booking-1",
        paymentId: "payment-1",
        transactionId: "GCASH-1",
        guestPaidTotal: 12000,
        stayprimeMarkup: 2000,
        hostPayout: 10000,
        targetPayoutBy: "2026-06-25T09:00:00.000Z",
        status: "available",
      }),
    ]);
  });

  it("records a payout against the booking transaction so it is not paid twice", async () => {
    await recordHostPayout("host-1", 10000, { bookingId: "booking-1", paymentId: "payment-1" });

    const stored = vi.mocked(writeStoredPayouts).mock.calls[0]?.[0] as Payout[];
    expect(stored[0]).toMatchObject({
      hostId: "host-1",
      bookingId: "booking-1",
      paymentId: "payment-1",
      amount: 10000,
      status: "paid",
      availableOn: "2026-06-24T09:00:00.000Z",
    });
  });
});
