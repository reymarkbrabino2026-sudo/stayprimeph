import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking, Property, User } from "@/lib/types";

vi.mock("server-only", () => ({}));

const authState = vi.hoisted(() => ({
  currentUser: null as User | null,
  stripeCheckoutCreate: vi.fn(async () => ({ url: "https://checkout.stripe.test/session" })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async (role: string | string[], options?: { message?: string; forbiddenMessage?: string }) => {
    const user = authState.currentUser;
    if (!user) throw new Error(options?.message ?? "Please sign in to continue.");
    const allowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;
    if (!allowed) throw new Error(options?.forbiddenMessage ?? "Forbidden.");
    return user;
  }),
  requireUser: vi.fn(async () => {
    if (!authState.currentUser) throw new Error("Please sign in to continue.");
    return authState.currentUser;
  }),
  requireVerifiedEmail: vi.fn((user: User) => {
    if (!user.emailVerifiedAt) throw new Error("Verify your email address before using this feature.");
  }),
  verifyPassword: vi.fn(() => true),
}));

vi.mock("@/lib/account-settings", () => ({
  saveBookingPermissions: vi.fn(),
  saveFinancialSettings: vi.fn(),
  saveNotificationSettings: vi.fn(),
  savePersonalInfo: vi.fn(async (_user, profile) => profile),
  savePrivacySettings: vi.fn(),
  saveProfessionalHostingTools: vi.fn(),
  saveWorkTravelProfile: vi.fn(),
}));

vi.mock("@/lib/availability", () => ({
  getAvailabilityBlocks: vi.fn(async () => []),
}));

vi.mock("@/lib/availability-calendar", () => ({
  hasAvailabilityBlockConflict: vi.fn(() => false),
}));

vi.mock("@/lib/bookings", () => ({
  cancelBookingByGuest: vi.fn(),
  getBookingById: vi.fn(),
  getBookings: vi.fn(async () => []),
  hasDateConflict: vi.fn(() => false),
}));

vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(async () => []),
  writeStoredBookings: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendBookingConfirmedEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://example.test",
    PAYMENT_LAUNCH_MODE: "stripe",
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test",
  },
}));

vi.mock("@/lib/host-expense-store", () => ({
  appendHostExpenses: vi.fn(),
  readHostExpenses: vi.fn(async () => []),
  removeHostExpense: vi.fn(),
  replaceHostExpense: vi.fn(),
}));

vi.mock("@/lib/host-report-store", () => ({
  readHostMonthlyReports: vi.fn(async () => []),
  removeHostMonthlyReport: vi.fn(),
  saveHostMonthlyReport: vi.fn(),
}));

vi.mock("@/lib/host-wizard-data", () => ({
  amenityGroups: [],
}));

vi.mock("@/lib/host-wizard-schema", () => ({
  hostListingSchema: { safeParse: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/messages", () => ({
  createMessage: vi.fn(),
}));

vi.mock("@/lib/payments", () => ({
  arePaidBookingsEnabled: vi.fn(() => true),
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: authState.stripeCheckoutCreate } },
  })),
  isStripeCheckoutEnabled: vi.fn(() => true),
  readManualPaymentInput: vi.fn(),
  submitManualPayment: vi.fn(),
}));

vi.mock("@/lib/pricing", () => ({
  calculateDefaultWeekendPrice: vi.fn((price: number) => price),
  calculateGuestPriceWithMarkup: vi.fn((price: number) => price),
  calculateNightlySubtotal: vi.fn(() => ({ nights: 1, subtotal: 1000 })),
  calculatePackageSubtotal: vi.fn(() => ({ nights: 1, subtotal: 1000 })),
  calculateStayprimeMarkup: vi.fn(() => 200),
  getBestDiscount: vi.fn(() => null),
  getBookingPackageById: vi.fn(() => null),
  getEnabledBookingPackages: vi.fn(() => []),
}));

vi.mock("@/lib/properties", () => ({
  getPropertyById: vi.fn(),
}));

vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(async () => []),
  writeStoredProperties: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(async () => ({ limited: false })),
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: vi.fn(),
  isTrustedRequestOrigin: vi.fn(() => true),
  untrustedRequestMessage: "Request origin could not be verified.",
}));

vi.mock("@/lib/csrf", () => ({
  assertValidCsrfForm: vi.fn(),
  assertValidCsrfToken: vi.fn(),
  csrfFieldName: "csrfToken",
  getCsrfToken: vi.fn(async () => "csrf-test-token"),
  invalidCsrfMessage: "Request token could not be verified.",
}));

vi.mock("@/lib/repositories", () => ({
  createBookingInDatabase: vi.fn(),
  createPropertyInDatabase: vi.fn(),
  updateBookingStatusInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/reviews", () => ({
  canReviewBooking: vi.fn(() => false),
  createStayReview: vi.fn(),
  getReviewForBooking: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
  getUsers: vi.fn(async () => []),
}));

import { savePersonalInfoAction } from "@/app/account-settings/actions";
import { cancelGuestBooking } from "@/app/guest/bookings/actions";
import { sendHostMessage } from "@/app/guest/messages/actions";
import { createListing } from "@/app/host/listings/actions";
import { acceptBooking } from "@/app/host/bookings/actions";
import { sendGuestMessage } from "@/app/host/messages/actions";
import { deleteHostMonthlyReport, updateHostExpense } from "@/app/host/reports/actions";
import { POST as createPaymentCheckout } from "@/app/api/payments/checkout/route";
import { cancelBookingByGuest, getBookingById, getBookings } from "@/lib/bookings";
import { savePersonalInfo } from "@/lib/account-settings";
import { createMessage } from "@/lib/messages";
import { getPropertyById } from "@/lib/properties";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { readHostExpenses, replaceHostExpense } from "@/lib/host-expense-store";
import { readHostMonthlyReports, removeHostMonthlyReport } from "@/lib/host-report-store";
import { getUserById } from "@/lib/users";

const hostUser = {
  id: "host-1",
  name: "Host One",
  email: "host@example.test",
  role: "host",
  avatar: "HO",
  phone: "",
  createdAt: "2026-06-18",
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
} satisfies User;

const guestUser = {
  id: "guest-1",
  name: "Guest One",
  email: "guest@example.test",
  role: "guest",
  avatar: "GO",
  phone: "",
  createdAt: "2026-06-18",
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
  passwordHash: "hash",
} satisfies User;

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

const property = {
  id: "property-1",
  hostId: "host-1",
  slug: "listing",
  title: "Listing",
  description: "A listing",
  address: "123 Street",
  city: "Manila",
  country: "Philippines",
  pricePerNight: 2500,
  bedrooms: 1,
  bathrooms: 1,
  maxGuests: 2,
  propertyType: "House",
  status: "approved",
  rating: 0,
  amenities: [],
  rules: [],
  createdAt: "2026-06-18",
  images: [],
} satisfies Property;

function formData(values: Record<string, string>) {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => form.set(key, value));
  return form;
}

describe("IDOR protections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = null;
    authState.stripeCheckoutCreate.mockClear();
  });

  it("blocks a host from accepting another host's booking", async () => {
    authState.currentUser = hostUser;
    vi.mocked(getBookingById).mockResolvedValueOnce({ ...booking, hostId: "host-2" });

    await expect(acceptBooking(formData({ id: booking.id }))).rejects.toThrow("Booking request not found.");

    expect(writeStoredBookings).not.toHaveBeenCalled();
    expect(sendBookingConfirmedEmail).not.toHaveBeenCalled();
  });

  it("blocks a host from confirming an unpaid booking when paid bookings are enabled", async () => {
    authState.currentUser = hostUser;
    vi.mocked(getBookingById).mockResolvedValueOnce(booking);

    await expect(acceptBooking(formData({ id: booking.id }))).rejects.toThrow(
      "Booking payment must be verified by the platform before confirmation.",
    );

    expect(writeStoredBookings).not.toHaveBeenCalled();
    expect(sendBookingConfirmedEmail).not.toHaveBeenCalled();
  });

  it("blocks a guest from cancelling another guest's booking", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getBookingById).mockResolvedValueOnce({ ...booking, guestId: "guest-2" });

    const result = await cancelGuestBooking({ error: undefined }, formData({ bookingId: booking.id, reason: "Tampered id" }));

    expect(result).toEqual({ error: "Booking not found." });
    expect(cancelBookingByGuest).not.toHaveBeenCalled();
  });

  it("does not let a listing create request spoof the listing owner", async () => {
    authState.currentUser = hostUser;
    vi.mocked(readStoredProperties).mockResolvedValueOnce([]);

    await expect(
      createListing(formData({
        hostId: "host-2",
        title: "Spoofed owner listing",
        description: "Attempt to assign this listing to another host.",
        address: "123 Street",
        city: "Manila",
        country: "Philippines",
        propertyType: "House",
        pricePerNight: "2500",
        bedrooms: "1",
        bathrooms: "1",
        maxGuests: "2",
      })),
    ).rejects.toThrow("NEXT_REDIRECT:/host/listings");

    expect(writeStoredProperties).toHaveBeenCalledWith([
      expect.objectContaining({ hostId: hostUser.id }),
    ]);
    expect(writeStoredProperties).not.toHaveBeenCalledWith([
      expect.objectContaining({ hostId: "host-2" }),
    ]);
  });

  it("does not attach another guest's booking to a guest-host message", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getPropertyById).mockResolvedValueOnce(property);
    vi.mocked(getBookings).mockResolvedValueOnce([{ ...booking, guestId: "guest-2" }]);

    await expect(sendHostMessage(formData({ propertyId: property.id, message: "Hello host" }))).rejects.toThrow(
      "NEXT_REDIRECT:/guest/messages",
    );

    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({
      senderId: guestUser.id,
      receiverId: property.hostId,
      propertyId: property.id,
      bookingId: undefined,
    }));
  });

  it("blocks a host from replying in another host's booking conversation", async () => {
    authState.currentUser = hostUser;
    vi.mocked(getUserById).mockResolvedValueOnce({ ...guestUser, id: "guest-2" });
    vi.mocked(getBookingById).mockResolvedValueOnce({ ...booking, guestId: "guest-2", hostId: "host-2" });
    vi.mocked(getPropertyById).mockResolvedValueOnce({ ...property, hostId: "host-2" });

    await expect(
      sendGuestMessage(formData({ guestId: "guest-2", bookingId: booking.id, propertyId: property.id, message: "Tampered reply" })),
    ).rejects.toThrow("Conversation not found.");

    expect(createMessage).not.toHaveBeenCalled();
  });

  it("blocks a host from editing another host's expense report item", async () => {
    authState.currentUser = hostUser;
    vi.mocked(readHostExpenses).mockResolvedValueOnce([
      {
        id: "expense-1",
        hostId: "host-2",
        expenseDate: "2026-06-20",
        month: "2026-06",
        category: "Cleaning",
        amount: 100,
        vendor: "Vendor",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
      },
    ]);

    await expect(
      updateHostExpense(formData({
        expenseId: "expense-1",
        expenseDate: "2026-06-21",
        category: "Cleaning",
        amount: "200",
        vendor: "Vendor",
      })),
    ).rejects.toThrow("You can only edit your own expenses.");

    expect(replaceHostExpense).not.toHaveBeenCalled();
  });

  it("blocks a host from deleting another host's sales report", async () => {
    authState.currentUser = hostUser;
    vi.mocked(readHostMonthlyReports).mockResolvedValueOnce([
      {
        id: "report-1",
        hostId: "host-2",
        month: "2026-06",
        reportDate: "2026-06-20",
        salesAmount: 5000,
        expensesAmount: 0,
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
      },
    ]);

    await expect(deleteHostMonthlyReport(formData({ reportId: "report-1", month: "2026-06" }))).rejects.toThrow(
      "You can only delete your own sales entries.",
    );

    expect(removeHostMonthlyReport).not.toHaveBeenCalled();
  });

  it("does not create checkout sessions for another guest's booking", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getBookings).mockResolvedValueOnce([{ ...booking, guestId: "guest-2" }]);

    const response = await createPaymentCheckout(
      new Request("https://example.test/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ error: "Booking not found." });
    expect(response.status).toBe(404);
    expect(authState.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("uses a processing return URL so only the payment webhook marks bookings paid", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getBookings).mockResolvedValueOnce([booking]);
    vi.mocked(getPropertyById).mockResolvedValueOnce(property);

    const response = await createPaymentCheckout(
      new Request("https://example.test/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ url: "https://checkout.stripe.test/session" });
    expect(response.status).toBe(200);
    expect(authState.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining(`/guest/bookings/${booking.id}?payment=processing`),
        metadata: { bookingId: booking.id },
      }),
    );
    expect(authState.stripeCheckoutCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining("payment=success"),
      }),
    );
    expect(writeStoredBookings).not.toHaveBeenCalled();
  });

  it("saves account settings only for the authenticated account, not a submitted user id", async () => {
    authState.currentUser = guestUser;
    const hostileProfile = {
      legalName: "Guest One",
      preferredName: "Guest",
      email: guestUser.email,
      phone: "555-0100",
      identity: "",
      residentialAddress: "",
      mailingAddress: "",
      emergencyContact: "",
      userId: "guest-2",
    };

    const result = await savePersonalInfoAction(hostileProfile);

    expect(result).toEqual({ ok: true, data: hostileProfile });
    expect(savePersonalInfo).toHaveBeenCalledWith(guestUser, hostileProfile, { currentPassword: undefined });
    expect(savePersonalInfo).not.toHaveBeenCalledWith(expect.objectContaining({ id: "guest-2" }), expect.anything(), expect.anything());
  });
});
