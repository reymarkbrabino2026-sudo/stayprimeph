import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking, BookingPackage, Property, User } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  currentUser: null as User | null,
  stripeCheckoutCreate: vi.fn(async () => ({ url: "https://checkout.stripe.test/session" })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
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

vi.mock("@/lib/payment-store", () => ({
  readStoredPayments: vi.fn(async () => []),
  writeStoredPayments: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendBookingConfirmedEmail: vi.fn(),
  sendBookingReceivedEmail: vi.fn(),
  sendBookingRequestEmail: vi.fn(),
  sendPaymentReceiptEmail: vi.fn(),
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
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/messages", () => ({
  createMessage: vi.fn(),
}));

vi.mock("@/lib/payments", () => ({
  arePaidBookingsEnabled: vi.fn(() => true),
  confirmManualPayment: vi.fn(),
  getPaymentByBookingId: vi.fn(),
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: authState.stripeCheckoutCreate } },
  })),
  isStripeCheckoutEnabled: vi.fn(() => true),
  markManualPaymentFullyPaid: vi.fn(),
  readManualPaymentInput: vi.fn(),
  rejectManualPayment: vi.fn(),
  submitManualPayment: vi.fn(),
}));

vi.mock("@/lib/payment-receipts", () => ({
  sendGuestPaymentReceipt: vi.fn(),
}));

vi.mock("@/lib/pricing", () => ({
  allowsPackageBooking: vi.fn(() => true),
  allowsStayBooking: vi.fn(() => true),
  calculateDefaultWeekendPrice: vi.fn((price: number) => price),
  calculateGuestPriceWithMarkup: vi.fn((price: number) => price),
  calculateNightlySubtotal: vi.fn(() => ({ nights: 1, subtotal: 1000 })),
  calculatePackageSubtotal: vi.fn(() => ({ nights: 1, subtotal: 1000 })),
  calculateStayprimeMarkup: vi.fn(() => 200),
  findBookingPackageById: vi.fn(() => null),
  getBestDiscount: vi.fn(() => null),
  getBookingPackageById: vi.fn(() => null),
  getEnabledBookingPackages: vi.fn(() => []),
  getFullAccessBookingPackage: vi.fn((packages: BookingPackage[]) => packages.find((item) => item.unit === "night") ?? null),
}));

vi.mock("@/lib/properties", () => ({
  getPropertyById: vi.fn(),
  getProperties: vi.fn(async () => []),
  revalidatePublicListingSummaries: vi.fn(),
}));

vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(async () => []),
  writeStoredProperties: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(async () => ({ limited: false })),
  rateLimitKey: vi.fn((scope: string, ...parts: string[]) => [scope, ...parts].filter(Boolean).join(":")),
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
  beginStripeCheckoutAttemptInDatabase: vi.fn(),
  clearStripeCheckoutAttemptInDatabase: vi.fn(),
  confirmManualPaymentInDatabase: vi.fn(),
  createBookingInDatabase: vi.fn(),
  createPropertyInDatabase: vi.fn(),
  deleteDraftPropertyInDatabase: vi.fn(),
  listPaymentsFromDatabase: vi.fn(async () => []),
  recordStripeCheckoutSessionInDatabase: vi.fn(),
  recordManualPaymentInDatabase: vi.fn(),
  updatePropertyDetailsInDatabase: vi.fn(),
  upsertDraftPropertyInDatabase: vi.fn(),
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

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(async () => []),
  writeStoredUsers: vi.fn(),
}));

import { savePersonalInfoAction } from "@/app/account-settings/actions";
import { cancelGuestBooking } from "@/app/guest/bookings/actions";
import { sendHostMessage } from "@/app/guest/messages/actions";
import { createBooking } from "@/app/bookings/checkout/[propertyId]/actions";
import { createListing, publishWizardListing, saveWizardListingDraft, updateListing } from "@/app/host/listings/actions";
import { acceptBooking } from "@/app/host/bookings/actions";
import { createExternalReservation } from "@/app/host/erp/[section]/actions";
import { sendGuestMessage } from "@/app/host/messages/actions";
import { deleteHostMonthlyReport, updateHostExpense } from "@/app/host/reports/actions";
import { POST as createPaymentCheckout } from "@/app/api/payments/checkout/route";
import { cancelBookingByGuest, getBookingById, getBookings, hasDateConflict } from "@/lib/bookings";
import { calculatePackageSubtotal, findBookingPackageById, getEnabledBookingPackages } from "@/lib/pricing";
import { savePersonalInfo } from "@/lib/account-settings";
import { createMessage } from "@/lib/messages";
import { getProperties, getPropertyById, revalidatePublicListingSummaries } from "@/lib/properties";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { getPaymentByBookingId } from "@/lib/payments";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { readHostExpenses, replaceHostExpense } from "@/lib/host-expense-store";
import { readHostMonthlyReports, removeHostMonthlyReport } from "@/lib/host-report-store";
import { hostListingSchema } from "@/lib/host-wizard-schema";
import { assertValidCsrfForm } from "@/lib/csrf";
import { confirmManualPaymentInDatabase } from "@/lib/repositories";
import { getUserById } from "@/lib/users";
import { revalidatePath } from "next/cache";

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

const adminUser = {
  id: "admin-1",
  name: "Admin One",
  email: "admin@example.test",
  role: "admin",
  avatar: "AO",
  phone: "",
  createdAt: "2026-06-18",
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
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

const dayPackage = {
  id: "daytime",
  name: "Daytime Ground Floor & Outdoor",
  accessType: "Ground floor and outdoor area only",
  unit: "day",
  weekdayRate: 4300,
  weekendRate: 4300,
  holidayRate: 4300,
  includedGuests: 10,
  maxGuests: 20,
  additionalGuestFee: 0,
  extensionHourlyFee: 0,
  checkInTime: "2:00 PM",
  checkOutTime: "10:00 PM",
  enabled: true,
} satisfies BookingPackage;

const fullAccessPackage = {
  id: "overnight-full-access",
  name: "Overnight Full Access",
  accessType: "Full access",
  unit: "night",
  weekdayRate: 8600,
  weekendRate: 8600,
  holidayRate: 8600,
  includedGuests: 10,
  maxGuests: 20,
  additionalGuestFee: 0,
  extensionHourlyFee: 0,
  checkInTime: "2:00 PM",
  checkOutTime: "10:00 PM",
  enabled: true,
} satisfies BookingPackage;

function draftPropertyId(hostId: string, uploadScopeId: string) {
  return `draft-${createHash("sha256").update(`${hostId}:${uploadScopeId}`).digest("hex").slice(0, 18)}`;
}

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
    vi.mocked(hasDateConflict).mockReset();
    vi.mocked(hasDateConflict).mockReturnValue(false);
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

  it("blocks a stale double-booking when dates are taken before the final write", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getPropertyById).mockResolvedValueOnce(property);
    vi.mocked(getBookings).mockResolvedValueOnce([]);
    vi.mocked(hasDateConflict)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    vi.mocked(readStoredBookings).mockResolvedValueOnce([
      {
        ...booking,
        id: "existing-booking",
        status: "confirmed",
        checkIn: "2026-07-10",
        checkOut: "2026-07-12",
      },
    ]);

    await expect(
      createBooking(formData({
        propertyId: property.id,
        checkIn: "2026-07-10",
        checkOut: "2026-07-12",
        guests: "2",
      })),
    ).rejects.toThrow("Those dates are no longer available.");

    expect(writeStoredBookings).not.toHaveBeenCalled();
  });

  it("promotes a multi-day daytime request to full access", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getPropertyById).mockResolvedValueOnce({ ...property, bookingPackages: [dayPackage, fullAccessPackage] });
    vi.mocked(getBookings).mockResolvedValueOnce([]);
    vi.mocked(getEnabledBookingPackages).mockReturnValueOnce([dayPackage, fullAccessPackage]);
    vi.mocked(findBookingPackageById).mockReturnValueOnce(dayPackage);

    await expect(
      createBooking(formData({
        propertyId: property.id,
        checkIn: "2026-07-10",
        checkOut: "2026-07-15",
        guests: "2",
        packageId: dayPackage.id,
      })),
    ).rejects.toThrow(`NEXT_REDIRECT:/guest/bookings/`);

    expect(calculatePackageSubtotal).toHaveBeenCalledWith(fullAccessPackage, "2026-07-10", "2026-07-15", 2);
    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingPackageId: fullAccessPackage.id,
        bookingPackageName: fullAccessPackage.name,
        bookingPackageUnit: "night",
      }),
    ]);
  });

  it("requires admin review even when an admin records an external manual payment", async () => {
    authState.currentUser = adminUser;
    vi.mocked(getProperties).mockResolvedValueOnce([property]);
    vi.mocked(readStoredBookings).mockResolvedValueOnce([]);
    vi.mocked(readStoredPayments).mockResolvedValueOnce([]);

    await expect(
      createExternalReservation(formData({
        propertyId: property.id,
        guestName: "Walk-in Guest",
        guestEmail: "walkin@example.test",
        checkIn: "2026-07-10",
        checkOut: "2026-07-12",
        guests: "2",
        totalPrice: "5000",
        paymentMethod: "gcash",
        transactionId: "manual-ref-1",
      })),
    ).rejects.toThrow("NEXT_REDIRECT:/host/erp/reservations?month=2026-07&status=pending");

    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({
        status: "pending",
        paymentStatus: "submitted",
      }),
    ]);
    expect(writeStoredPayments).toHaveBeenCalledWith([
      expect.objectContaining({
        paymentMethod: "gcash",
        paymentStatus: "submitted",
        transactionId: "manual-ref-1",
      }),
    ]);
    const storedPayment = vi.mocked(writeStoredPayments).mock.calls[0]?.[0][0];
    expect(storedPayment).not.toHaveProperty("confirmedAt");
    expect(storedPayment).not.toHaveProperty("confirmedBy");
    expect(confirmManualPaymentInDatabase).not.toHaveBeenCalled();
  });

  it("blocks a guest from cancelling another guest's booking", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getBookingById).mockResolvedValueOnce({ ...booking, guestId: "guest-2" });

    const result = await cancelGuestBooking({ error: undefined }, formData({ bookingId: booking.id, reason: "Tampered id" }));

    expect(result).toEqual({ error: "Booking not found." });
    expect(cancelBookingByGuest).not.toHaveBeenCalled();
  });

  it("lets a guest cancel their own confirmed future booking", async () => {
    authState.currentUser = guestUser;
    const futureCheckIn = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const futureCheckOut = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const confirmedBooking = {
      ...booking,
      status: "confirmed",
      paymentStatus: "paid",
      checkIn: futureCheckIn,
      checkOut: futureCheckOut,
    } satisfies Booking;
    vi.mocked(getBookingById).mockResolvedValueOnce(confirmedBooking);
    vi.mocked(getPaymentByBookingId).mockResolvedValueOnce(null);

    await expect(
      cancelGuestBooking({ error: undefined }, formData({ bookingId: booking.id, reason: "Plans changed" })),
    ).rejects.toThrow(`NEXT_REDIRECT:/guest/bookings/${booking.id}?cancel=success`);

    expect(cancelBookingByGuest).toHaveBeenCalledWith(
      confirmedBooking,
      "Plans changed",
      expect.objectContaining({ status: "review" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/guest/bookings/${booking.id}`);
    expect(revalidatePath).toHaveBeenCalledWith("/host/bookings");
  });

  it("returns a cancellation form error when the request token is invalid", async () => {
    authState.currentUser = guestUser;
    vi.mocked(assertValidCsrfForm).mockRejectedValueOnce(new Error("Request token could not be verified."));

    const result = await cancelGuestBooking({ error: undefined }, formData({ bookingId: booking.id, reason: "Plans changed" }));

    expect(result).toEqual({ error: "Request token could not be verified." });
    expect(getBookingById).not.toHaveBeenCalled();
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

  it("lets a host update their own listing price", async () => {
    authState.currentUser = hostUser;
    vi.mocked(getPropertyById).mockResolvedValueOnce(property);
    vi.mocked(readStoredProperties).mockResolvedValueOnce([property]);

    await expect(
      updateListing(formData({
        id: property.id,
        title: property.title,
        description: property.description,
        address: property.address,
        city: property.city,
        country: property.country,
        propertyType: property.propertyType,
        pricePerNight: "3200",
        weekendPrice: "3900",
        cleaningFee: "250",
        securityDeposit: "1000",
        currency: "PHP",
        bedrooms: String(property.bedrooms),
        bathrooms: String(property.bathrooms),
        maxGuests: String(property.maxGuests),
        amenities: "Wi-Fi",
        photoUrls: "/uploads/listings/host-1/property-1/cover.jpg",
      })),
    ).rejects.toThrow(`NEXT_REDIRECT:/host/listings/${property.id}?updated=1`);

    expect(writeStoredProperties).toHaveBeenCalledWith([
      expect.objectContaining({
        id: property.id,
        hostId: hostUser.id,
        pricePerNight: 3200,
        weekendPrice: 3900,
        cleaningFee: 250,
        securityDeposit: 1000,
        currency: "PHP",
        amenities: ["Wi-Fi"],
        images: [
          expect.objectContaining({
            propertyId: property.id,
            imageUrl: "/uploads/listings/host-1/property-1/cover.jpg",
          }),
        ],
        status: property.status,
      }),
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/host/listings/${property.id}`);
    expect(revalidatePublicListingSummaries).toHaveBeenCalled();
  });

  it("blocks a host from editing another host's listing", async () => {
    authState.currentUser = hostUser;
    vi.mocked(getPropertyById).mockResolvedValueOnce({ ...property, hostId: "host-2" });

    await expect(
      updateListing(formData({
        id: property.id,
        title: "Tampered listing",
        description: property.description,
        address: property.address,
        city: property.city,
        country: property.country,
        propertyType: property.propertyType,
        pricePerNight: "999",
        weekendPrice: "999",
        cleaningFee: "0",
        securityDeposit: "0",
        currency: "PHP",
        bedrooms: String(property.bedrooms),
        bathrooms: String(property.bathrooms),
        maxGuests: String(property.maxGuests),
      })),
    ).rejects.toThrow("Listing not found.");

    expect(writeStoredProperties).not.toHaveBeenCalled();
  });

  it("publishes a completed wizard listing for the signed-in host", async () => {
    authState.currentUser = hostUser;
    const uploadedPhotos = Array.from({ length: 5 }, (_, index) => ({
      id: `photo-${index + 1}`,
      url: `/uploads/listings/host-1/draft-1/photo-${index + 1}.jpg`,
      name: `photo-${index + 1}.jpg`,
      size: 100,
      isCover: index === 0,
    }));
    const listing = {
      uploadScopeId: "draft-1",
      country: "Philippines",
      street: "123 Street",
      barangay: "Barangay",
      city: "Manila",
      province: "Metro Manila",
      zipCode: "1000",
      latitude: 14.5995,
      longitude: 120.9842,
      locationConfirmed: true,
      locationConfirmedAddress: "123 Street, Barangay, Manila, Metro Manila, Philippines, 1000",
      propertyType: "House",
      privacyType: "entire",
      preciseLocation: true,
      guests: 6,
      bedrooms: 2,
      beds: 3,
      bathrooms: 2,
      rooms: [],
      amenityIds: ["wifi"],
      photos: uploadedPhotos,
      title: "Wizard Listing",
      highlights: ["peaceful"],
      description: "A complete listing drafted through the host wizard.",
      bookingMode: "request",
      pricingMode: "simple",
      basePrice: 3500,
      weekendPrice: 4200,
      weekendPremium: 20,
      cleaningFee: 500,
      securityDeposit: 1000,
      currency: "PHP",
      cancellationPolicy: "flexible",
      discounts: { newListing: true, lastMinute: true, weekly: true, monthly: false },
      safetyDisclosures: { exteriorCamera: false, noiseMonitor: false, weapons: false },
      residentialAddress: {
        unit: "",
        building: "",
        street: "123 Host Street",
        barangay: "Barangay",
        city: "Manila",
        zipCode: "1000",
        province: "Metro Manila",
      },
      hostAsBusiness: false,
      status: "pending",
      bookingPackages: [],
    };
    vi.mocked(hostListingSchema.safeParse).mockReturnValueOnce({ success: true, data: listing } as never);
    const savedDraft = {
      ...property,
      id: draftPropertyId(hostUser.id, "draft-1"),
      slug: draftPropertyId(hostUser.id, "draft-1"),
      status: "draft",
    } satisfies Property;
    vi.mocked(readStoredProperties).mockResolvedValueOnce([savedDraft, property]);

    await expect(publishWizardListing(listing as never, "csrf-test-token")).resolves.toEqual({ status: "published" });

    expect(writeStoredProperties).toHaveBeenCalledWith([
      expect.objectContaining({
        hostId: hostUser.id,
        title: "Wizard Listing",
        status: "pending",
        address: "123 Street, Barangay",
        city: "Manila",
        province: "Metro Manila",
        zipCode: "1000",
        pricePerNight: 3500,
        weekendPrice: 4200,
        maxGuests: 6,
        images: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining("-photo-1"),
            imageUrl: "/uploads/listings/host-1/draft-1/photo-1.jpg",
          }),
        ]),
      }),
      property,
    ]);
    expect(writeStoredProperties).not.toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: savedDraft.id, status: "draft" }),
    ]));
    expect(revalidatePath).toHaveBeenCalledWith("/host/listings");
    expect(revalidatePublicListingSummaries).toHaveBeenCalled();
  });

  it("saves wizard progress as a draft listing for the signed-in host", async () => {
    authState.currentUser = hostUser;
    vi.mocked(readStoredProperties).mockResolvedValueOnce([property]);

    await saveWizardListingDraft({
      uploadScopeId: "draft-1",
      street: "42 Draft Lane",
      barangay: "Barangay",
      city: "Tagaytay",
      province: "Cavite",
      country: "Philippines",
      zipCode: "4120",
      propertyType: "Villa",
      guests: 8,
      bedrooms: 2,
      bathrooms: 2,
      amenityIds: ["wifi"],
      basePrice: 2800,
      weekendPrice: 3200,
    }, "csrf-test-token");

    expect(writeStoredProperties).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.stringMatching(/^draft-/),
        slug: expect.stringMatching(/^draft-/),
        hostId: hostUser.id,
        status: "draft",
        title: "Untitled draft",
        address: "42 Draft Lane, Barangay",
        city: "Tagaytay",
        province: "Cavite",
        zipCode: "4120",
        propertyType: "Villa",
        pricePerNight: 2800,
        weekendPrice: 3200,
        maxGuests: 8,
        images: [
          expect.objectContaining({ imageUrl: "pending-upload" }),
        ],
      }),
      property,
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/host/listings");
  });

  it("does not publish a wizard listing with another host's uploaded image", async () => {
    authState.currentUser = hostUser;
    vi.mocked(hostListingSchema.safeParse).mockReturnValueOnce({
      success: true,
      data: {
        uploadScopeId: "draft-1",
        locationConfirmedAddress: "123 Street, Barangay, Manila, Metro Manila, Philippines, 1000",
        street: "123 Street",
        barangay: "Barangay",
        city: "Manila",
        province: "Metro Manila",
        country: "Philippines",
        zipCode: "1000",
        photos: [
          {
            id: "photo-1",
            url: "https://store.public.blob.vercel-storage.com/uploads/listings/host-2/draft-1/photo.jpg",
            name: "photo.jpg",
            size: 100,
            isCover: true,
          },
        ],
      },
    } as never);

    await expect(publishWizardListing({} as never, "csrf-test-token")).resolves.toEqual({
      status: "error",
      error: "Listing photos must be uploaded through StayPrimePH before publishing.",
    });

    expect(writeStoredProperties).not.toHaveBeenCalled();
  });

  it("does not publish a wizard listing with another host's uploaded room image", async () => {
    authState.currentUser = hostUser;
    vi.mocked(hostListingSchema.safeParse).mockReturnValueOnce({
      success: true,
      data: {
        uploadScopeId: "draft-1",
        locationConfirmedAddress: "123 Street, Barangay, Manila, Metro Manila, Philippines, 1000",
        street: "123 Street",
        barangay: "Barangay",
        city: "Manila",
        province: "Metro Manila",
        country: "Philippines",
        zipCode: "1000",
        photos: [
          {
            id: "photo-1",
            url: "https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-1/photo.jpg",
            name: "photo.jpg",
            size: 100,
            isCover: true,
          },
        ],
        rooms: [
          {
            id: "room-1",
            name: "Suite",
            capacity: 2,
            floor: "Ground Floor",
            description: "",
            photos: ["https://store.public.blob.vercel-storage.com/uploads/listings/host-2/draft-1/room.jpg"],
            amenities: [],
            active: true,
          },
        ],
      },
    } as never);

    await expect(publishWizardListing({} as never, "csrf-test-token")).resolves.toEqual({
      status: "error",
      error: "Listing photos must be uploaded through StayPrimePH before publishing.",
    });

    expect(writeStoredProperties).not.toHaveBeenCalled();
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

  it("does not create a second checkout session while one is pending for the booking", async () => {
    authState.currentUser = guestUser;
    vi.mocked(getBookings).mockResolvedValueOnce([booking]);
    vi.mocked(getPropertyById).mockResolvedValueOnce(property);
    vi.mocked(readStoredPayments).mockResolvedValueOnce([
      {
        id: "payment-booking-1",
        bookingId: booking.id,
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "stripe",
        paymentStatus: "pending",
        transactionId: `checkout-pending-${booking.id}`,
        createdAt: "2026-06-18T00:00:00.000Z",
      },
    ]);

    const response = await createPaymentCheckout(
      new Request("https://example.test/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ error: "A payment checkout is already in progress for this booking." });
    expect(response.status).toBe(409);
    expect(authState.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(writeStoredPayments).not.toHaveBeenCalled();
  });

  it("clears a pending checkout attempt if provider session creation fails", async () => {
    authState.currentUser = guestUser;
    const pendingPayment = {
      id: `payment-${booking.id}`,
      bookingId: booking.id,
      guestId: booking.guestId,
      hostId: booking.hostId,
      amount: booking.totalPrice,
      paymentMethod: "stripe",
      paymentStatus: "pending",
      transactionId: `checkout-pending-${booking.id}`,
      createdAt: "2026-06-18T00:00:00.000Z",
    } as const;
    vi.mocked(getBookings).mockResolvedValueOnce([booking]);
    vi.mocked(getPropertyById).mockResolvedValueOnce(property);
    vi.mocked(readStoredPayments)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingPayment]);
    authState.stripeCheckoutCreate.mockRejectedValueOnce(new Error("Stripe unavailable"));

    const response = await createPaymentCheckout(
      new Request("https://example.test/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ error: "Payment provider is unavailable. Please try again later." });
    expect(response.status).toBe(502);

    expect(writeStoredPayments).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({
        bookingId: booking.id,
        paymentMethod: "stripe",
        paymentStatus: "pending",
      }),
    ]);
    expect(writeStoredPayments).toHaveBeenLastCalledWith([]);
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
