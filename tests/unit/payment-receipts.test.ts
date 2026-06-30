import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking, Payment, Property, User } from "@/lib/types";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://stayprimeph.test",
  },
}));

vi.mock("@/lib/email", () => ({
  sendPaymentReceiptEmail: vi.fn(),
}));

vi.mock("@/lib/properties", () => ({
  getPropertyById: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
}));

import { sendPaymentReceiptEmail } from "@/lib/email";
import { sendGuestPaymentReceipt } from "@/lib/payment-receipts";
import { getPropertyById } from "@/lib/properties";
import { getUserById } from "@/lib/users";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-10",
  checkOut: "2026-07-12",
  guests: 2,
  totalPrice: 6000,
  status: "confirmed",
  paymentStatus: "paid",
  bookingPackageName: "Overnight Full Access",
  createdAt: "2026-06-29T00:00:00.000Z",
} satisfies Booking;

const property = {
  id: "property-1",
  hostId: "host-1",
  slug: "caya-villa",
  title: "Caya Villa",
  description: "Private villa",
  address: "123 Prime Street",
  city: "Tagaytay",
  country: "Philippines",
  pricePerNight: 5000,
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 8,
  propertyType: "Villa",
  status: "approved",
  rating: 4.9,
  amenities: [],
  rules: [],
  images: [{ id: "image-1", propertyId: "property-1", imageUrl: "/villa.jpg", tone: "warm" }],
  createdAt: "2026-06-01T00:00:00.000Z",
} satisfies Property;

const guest = {
  id: "guest-1",
  name: "Guest One",
  email: "guest@example.test",
  role: "guest",
  avatar: "",
  phone: "",
  createdAt: "2026-06-01T00:00:00.000Z",
} satisfies User;

const host = {
  id: "host-1",
  name: "Host One",
  email: "host@example.test",
  role: "host",
  avatar: "",
  phone: "",
  createdAt: "2026-06-01T00:00:00.000Z",
} satisfies User;

const payment = {
  id: "payment-booking-1",
  bookingId: booking.id,
  guestId: booking.guestId,
  hostId: booking.hostId,
  amount: booking.totalPrice,
  paymentMethod: "gcash",
  paymentStatus: "paid",
  transactionId: "GCASH-REF-12345",
  confirmedAt: "2026-06-29T06:30:00.000Z",
  createdAt: "2026-06-29T06:00:00.000Z",
} satisfies Payment;

describe("guest payment receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPropertyById).mockResolvedValue(property);
    vi.mocked(getUserById).mockImplementation(async (id: string) => {
      if (id === guest.id) return guest;
      if (id === host.id) return host;
      return null;
    });
  });

  it("builds and sends a receipt email to the guest for a confirmed payment", async () => {
    await sendGuestPaymentReceipt({ booking, payment });

    expect(sendPaymentReceiptEmail).toHaveBeenCalledTimes(1);
    expect(sendPaymentReceiptEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: guest.email,
      propertyTitle: property.title,
      propertyAddress: property.address,
      bookingPackageName: booking.bookingPackageName,
      actionUrl: `https://stayprimeph.test/guest/bookings/${booking.id}`,
      amountPaid: booking.totalPrice,
      paymentMethod: "gcash",
      paymentStatus: "paid",
      transactionId: payment.transactionId,
      receiptNumber: "BOOK-ING1",
      invoiceNumber: "SPH-BOOK-ING1",
    }));
  });

  it("does not send a receipt when the guest or property cannot be found", async () => {
    vi.mocked(getPropertyById).mockResolvedValueOnce(null);

    await sendGuestPaymentReceipt({ booking, payment });

    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });
});
