import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/account-settings", () => ({
  getAccountSettings: vi.fn(),
  savePrivacySettings: vi.fn(),
}));
vi.mock("@/lib/availability", () => ({
  getAvailabilityBlocks: vi.fn(),
}));
vi.mock("@/lib/bookings", () => ({
  getBookings: vi.fn(),
}));
vi.mock("@/lib/cancellations", () => ({
  getCancellations: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/host-expense-store", () => ({
  readHostExpenses: vi.fn(),
}));
vi.mock("@/lib/host-report-store", () => ({
  readHostMonthlyReports: vi.fn(),
}));
vi.mock("@/lib/json-store", () => ({
  readJsonStore: vi.fn(),
}));
vi.mock("@/lib/messages", () => ({
  getMessagesForUser: vi.fn(),
}));
vi.mock("@/lib/admin-data", () => ({
  getAdminPayments: vi.fn(),
  getAdminReviews: vi.fn(),
}));
vi.mock("@/lib/properties", () => ({
  getProperties: vi.fn(),
}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: vi.fn(() => false),
}));
vi.mock("@/lib/auth-token-store", () => ({
  readStoredAuthTokens: vi.fn(),
}));
vi.mock("@/lib/session-store", () => ({
  readStoredSessions: vi.fn(),
}));

import { getAccountSettings, savePrivacySettings } from "@/lib/account-settings";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getBookings } from "@/lib/bookings";
import { getCancellations } from "@/lib/cancellations";
import { readHostExpenses } from "@/lib/host-expense-store";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { readJsonStore } from "@/lib/json-store";
import { getMessagesForUser } from "@/lib/messages";
import { getAdminPayments, getAdminReviews } from "@/lib/admin-data";
import { getProperties } from "@/lib/properties";
import { readStoredAuthTokens } from "@/lib/auth-token-store";
import { readStoredSessions } from "@/lib/session-store";
import { buildUserDataExport, requestUserDataExport } from "@/lib/user-data-export";

const user = {
  id: "user-1",
  name: "Export User",
  email: "export@example.test",
  role: "host",
  avatar: "EU",
  phone: "+63000000000",
  createdAt: "2026-01-01",
  passwordHash: "hashed-password",
  emailVerifiedAt: "2026-01-02T00:00:00.000Z",
} satisfies User;

const privacy = {
  settings: {
    readReceipts: true,
    searchEngines: false,
    homeCity: false,
    tripType: false,
    lengthOfStay: true,
    bookedServices: false,
    aiFeatures: true,
  },
  blockedPeople: [],
  dataRequestedAt: null,
  deletionRequestedAt: null,
};

function mockExportSources() {
  vi.mocked(getAccountSettings).mockResolvedValue({
    personalInfo: {
      legalName: user.name,
      preferredName: "",
      email: user.email,
      phone: user.phone,
      identity: "",
      residentialAddress: "",
      mailingAddress: "",
      emergencyContact: "",
    },
    notifications: {
      offers: { preferences: {}, unsubscribed: false },
      account: { preferences: {}, unsubscribed: false },
    },
    privacy,
    bookingPermissions: {
      profilePhoto: false,
      verifiedPhone: true,
      instantBooking: false,
      newGuests: true,
    },
    workTravel: {
      email: "",
      companyName: "",
      department: "",
      employeeId: "",
      includeBusinessReceipts: true,
      verified: false,
    },
    professionalHostingTools: {
      professionalTools: true,
      ruleSets: false,
      bulkEditing: false,
    },
    financial: {
      paymentMethods: [],
      giftCredits: [],
      coupons: [],
      payoutMethods: [],
      taxpayer: null,
      vat: null,
      donationPreference: {
        recurring: false,
        amount: "50",
        nonprofit: "StayPrimePH Open Doors Fund",
        applyTo: "Bookings",
      },
      serviceFeeMode: "split",
    },
  });
  vi.mocked(getProperties).mockResolvedValue([
    { id: "property-1", hostId: user.id, slug: "mine", title: "Mine", description: "", address: "", city: "", country: "PH", pricePerNight: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, propertyType: "house", status: "approved", rating: 0, amenities: [], rules: [], createdAt: "2026-01-01", images: [] },
    { id: "property-2", hostId: "other-user", slug: "other", title: "Other", description: "", address: "", city: "", country: "PH", pricePerNight: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, propertyType: "house", status: "approved", rating: 0, amenities: [], rules: [], createdAt: "2026-01-01", images: [] },
  ]);
  vi.mocked(getBookings).mockResolvedValue([
    { id: "booking-1", propertyId: "property-1", guestId: "guest-1", hostId: user.id, checkIn: "2026-07-01", checkOut: "2026-07-02", guests: 1, totalPrice: 1000, status: "confirmed", paymentStatus: "paid", createdAt: "2026-06-01" },
    { id: "booking-2", propertyId: "property-2", guestId: "other-user", hostId: "other-host", checkIn: "2026-07-01", checkOut: "2026-07-02", guests: 1, totalPrice: 1000, status: "confirmed", paymentStatus: "paid", createdAt: "2026-06-01" },
  ]);
  vi.mocked(getMessagesForUser).mockResolvedValue([
    { id: "message-1", senderId: user.id, receiverId: "guest-1", message: "Hello", createdAt: "2026-06-01T00:00:00.000Z" },
  ]);
  vi.mocked(getAdminPayments).mockResolvedValue([
    { id: "payment-1", bookingId: "booking-1", guestId: "guest-1", hostId: user.id, amount: 1000, paymentMethod: "stripe", paymentStatus: "paid", transactionId: "txn-1", createdAt: "2026-06-01" },
    { id: "payment-2", bookingId: "booking-2", guestId: "other-user", hostId: "other-host", amount: 1000, paymentMethod: "stripe", paymentStatus: "paid", transactionId: "txn-2", createdAt: "2026-06-01" },
  ]);
  vi.mocked(getAdminReviews).mockResolvedValue([
    { id: "review-1", propertyId: "property-1", guestId: "guest-1", rating: 5, comment: "Great", createdAt: "2026-06-01" },
    { id: "review-2", propertyId: "property-2", guestId: "other-user", rating: 5, comment: "Other", createdAt: "2026-06-01" },
  ]);
  vi.mocked(getCancellations).mockResolvedValue([
    { id: "cancel-1", bookingId: "booking-1", propertyId: "property-1", status: "closed", createdAt: "2026-06-01" },
    { id: "cancel-2", bookingId: "booking-2", propertyId: "property-2", status: "closed", createdAt: "2026-06-01" },
  ]);
  vi.mocked(getAvailabilityBlocks).mockResolvedValue([
    { id: "block-1", propertyId: "property-1", date: "2026-07-01", reason: "owner_use", createdAt: "2026-06-01" },
    { id: "block-2", propertyId: "property-2", date: "2026-07-01", reason: "owner_use", createdAt: "2026-06-01" },
  ]);
  vi.mocked(readHostExpenses).mockResolvedValue([
    { id: "expense-1", hostId: user.id, expenseDate: "2026-06-01", month: "2026-06", category: "Supplies", amount: 100, vendor: "Store", createdAt: "2026-06-01", updatedAt: "2026-06-01" },
    { id: "expense-2", hostId: "other-user", expenseDate: "2026-06-01", month: "2026-06", category: "Supplies", amount: 100, vendor: "Store", createdAt: "2026-06-01", updatedAt: "2026-06-01" },
  ]);
  vi.mocked(readHostMonthlyReports).mockResolvedValue([
    { id: "report-1", hostId: user.id, month: "2026-06", salesAmount: 1000, expensesAmount: 100, createdAt: "2026-06-01", updatedAt: "2026-06-01" },
    { id: "report-2", hostId: "other-user", month: "2026-06", salesAmount: 1000, expensesAmount: 100, createdAt: "2026-06-01", updatedAt: "2026-06-01" },
  ]);
  vi.mocked(readJsonStore).mockImplementation(async (fileName) => {
    if (fileName === "wishlists.json") return [
      { id: "wishlist-1", userId: user.id, propertyId: "property-2" },
      { id: "wishlist-2", userId: "other-user", propertyId: "property-1" },
    ];
    if (fileName === "reports.json") return [
      { id: "support-1", reporterId: user.id, type: "safety", status: "open", details: "Mine", createdAt: "2026-06-01" },
      { id: "support-2", reporterId: "other-user", type: "safety", status: "open", details: "Other", createdAt: "2026-06-01" },
    ];
    return [];
  });
  vi.mocked(readStoredSessions).mockResolvedValue([
    { id: "session-1", userId: user.id, sessionHash: "secret-session-hash", expiresAt: "2026-12-01T00:00:00.000Z", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "session-2", userId: "other-user", sessionHash: "other-session-hash", expiresAt: "2026-12-01T00:00:00.000Z", createdAt: "2026-06-01T00:00:00.000Z" },
  ]);
  vi.mocked(readStoredAuthTokens).mockResolvedValue([
    { id: "token-1", userId: user.id, tokenHash: "secret-token-hash", type: "email_verification", expiresAt: "2026-12-01T00:00:00.000Z", createdAt: "2026-06-01T00:00:00.000Z" },
  ]);
}

describe("user data export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExportSources();
  });

  it("builds a scoped export without credential hashes or unrelated records", async () => {
    const result = await buildUserDataExport(user, new Date("2026-06-18T00:00:00.000Z"));
    const serialized = JSON.stringify(result);

    expect(result.generatedAt).toBe("2026-06-18T00:00:00.000Z");
    expect(result.user).toMatchObject({ id: user.id, email: user.email, hasPassword: true });
    expect(result.listings.map((item) => item.id)).toEqual(["property-1"]);
    expect(result.bookings.map((item) => item.id)).toEqual(["booking-1"]);
    expect(result.payments.map((item) => item.id)).toEqual(["payment-1"]);
    expect(result.reviews.map((item) => item.id)).toEqual(["review-1"]);
    expect(result.wishlists.map((item) => item.id)).toEqual(["wishlist-1"]);
    expect(result.cancellations.map((item) => item.id)).toEqual(["cancel-1"]);
    expect(result.availabilityBlocks.map((item) => item.id)).toEqual(["block-1"]);
    expect(result.hostExpenses.map((item) => item.id)).toEqual(["expense-1"]);
    expect(result.hostMonthlyReports.map((item) => item.id)).toEqual(["report-1"]);
    expect(result.supportReports.map((item) => item.id)).toEqual(["support-1"]);
    expect(result.security.activeSessionCount).toBe(1);
    expect(result.security.pendingAuthTokens).toEqual([
      { type: "email_verification", expiresAt: "2026-12-01T00:00:00.000Z", createdAt: "2026-06-01T00:00:00.000Z" },
    ]);
    expect(serialized).not.toContain("hashed-password");
    expect(serialized).not.toContain("secret-session-hash");
    expect(serialized).not.toContain("secret-token-hash");
    expect(serialized).not.toContain("payment-2");
    expect(serialized).not.toContain("support-2");
  });

  it("records the request timestamp when creating an export", async () => {
    const result = await requestUserDataExport(user);

    expect(result.filename).toBe(`stayprimeph-data-export-${user.id}-${result.data.generatedAt.slice(0, 10)}.json`);
    expect(result.contentType).toBe("application/json");
    expect(savePrivacySettings).toHaveBeenCalledWith(user, expect.objectContaining({
      dataRequestedAt: result.data.generatedAt,
    }));
  });
});
