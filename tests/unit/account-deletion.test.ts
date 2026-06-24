import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-logs", () => ({
  appendAdminLog: vi.fn(),
}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));
vi.mock("@/lib/account-settings", () => ({
  getAccountSettings: vi.fn(),
  savePrivacySettings: vi.fn(),
}));
vi.mock("@/lib/auth-tokens", () => ({
  consumeAuthToken: vi.fn(),
  issueAuthToken: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/email", () => ({
  sendAccountDeletionVerificationEmail: vi.fn(),
}));
vi.mock("@/lib/json-store", () => ({
  readJsonStore: vi.fn(),
  writeJsonStore: vi.fn(),
}));
vi.mock("@/lib/auth-token-store", () => ({
  readStoredAuthTokens: vi.fn(),
  writeStoredAuthTokens: vi.fn(),
}));
vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(),
}));
vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(),
  writeStoredProperties: vi.fn(),
}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: vi.fn(() => false),
}));
vi.mock("@/lib/session-store", () => ({
  readStoredSessions: vi.fn(),
  writeStoredSessions: vi.fn(),
}));
vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(),
  writeStoredUsers: vi.fn(),
}));
vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
}));

import { getAccountSettings, savePrivacySettings } from "@/lib/account-settings";
import { appendAdminLog } from "@/lib/admin-logs";
import { appendAuditLog } from "@/lib/audit-logs";
import { consumeAuthToken, issueAuthToken } from "@/lib/auth-tokens";
import { readStoredAuthTokens, writeStoredAuthTokens } from "@/lib/auth-token-store";
import { readStoredBookings } from "@/lib/booking-store";
import { accountDeletionSlaDays, deletionRequestWorkflow, requestAccountDeletion, verifyAccountDeletionRequest, processAccountDeletion } from "@/lib/account-deletion";
import { sendAccountDeletionVerificationEmail } from "@/lib/email";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

const user = {
  id: "guest-1",
  name: "Guest User",
  email: "guest@example.test",
  role: "guest",
  avatar: "GU",
  phone: "",
  createdAt: "2026-06-18",
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
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
  deletionVerifiedAt: null,
};

describe("verified account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a pending deletion request and sends a verification email", async () => {
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
      localization: {
        language: "English",
        currency: "Philippine peso (PHP)",
        region: "Philippines",
        measurementUnits: "Metric",
        timeZone: "Asia/Manila",
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
      },
    });
    vi.mocked(issueAuthToken).mockResolvedValueOnce("raw-deletion-token");

    const result = await requestAccountDeletion(user);

    expect(result.requestedAt).toEqual(expect.any(String));
    expect(savePrivacySettings).toHaveBeenCalledWith(user, expect.objectContaining({
      deletionRequestedAt: result.requestedAt,
      deletionVerifiedAt: null,
    }));
    expect(issueAuthToken).toHaveBeenCalledWith(user.id, "account_deletion", { requestedAt: result.requestedAt });
    expect(sendAccountDeletionVerificationEmail).toHaveBeenCalledWith({
      to: user.email,
      name: user.name,
      token: "raw-deletion-token",
    });
  });

  it("marks a deletion request verified after consuming the one-time token", async () => {
    vi.mocked(consumeAuthToken).mockResolvedValueOnce({
      id: "token-1",
      userId: user.id,
      tokenHash: "hash",
      type: "account_deletion",
      expiresAt: "2026-06-19T00:00:00.000Z",
      createdAt: "2026-06-18T00:00:00.000Z",
      metadata: { requestedAt: "2026-06-18T00:00:00.000Z" },
    });
    vi.mocked(readJsonStore).mockResolvedValueOnce([
      { userId: user.id, privacy: { deletionRequestedAt: "2026-06-18T00:00:00.000Z", deletionVerifiedAt: null } },
    ]);

    await expect(verifyAccountDeletionRequest("raw-token")).resolves.toBe(true);

    expect(consumeAuthToken).toHaveBeenCalledWith("raw-token", "account_deletion");
    expect(writeJsonStore).toHaveBeenCalledWith("account-settings.json", [
      expect.objectContaining({
        userId: user.id,
        privacy: expect.objectContaining({
          deletionRequestedAt: "2026-06-18T00:00:00.000Z",
          deletionVerifiedAt: expect.any(String),
        }),
      }),
    ]);
  });

  it("blocks admin anonymization until the deletion request is verified", async () => {
    vi.mocked(readJsonStore).mockResolvedValueOnce([
      { userId: user.id, privacy: { deletionRequestedAt: "2026-06-18T00:00:00.000Z", deletionVerifiedAt: null } },
    ]);
    vi.mocked(readStoredUsers).mockResolvedValueOnce([user]);

    await expect(processAccountDeletion({ adminId: "admin-1", targetUserId: user.id })).rejects.toThrow(
      "The account owner must verify the deletion request by email before anonymization.",
    );
    expect(writeStoredUsers).not.toHaveBeenCalled();
  });

  it("anonymizes a verified deletion request and revokes login material", async () => {
    vi.mocked(readJsonStore)
      .mockResolvedValueOnce([
        { userId: user.id, privacy: { deletionRequestedAt: "2026-06-18T00:00:00.000Z", deletionVerifiedAt: "2026-06-18T01:00:00.000Z" } },
      ])
      .mockResolvedValueOnce([
        { userId: user.id, privacy: { deletionRequestedAt: "2026-06-18T00:00:00.000Z", deletionVerifiedAt: "2026-06-18T01:00:00.000Z" } },
      ])
      .mockResolvedValueOnce([{ id: "wishlist-1", userId: user.id, propertyId: "property-1" }]);
    vi.mocked(readStoredUsers)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([user]);
    vi.mocked(readStoredBookings).mockResolvedValueOnce([]);
    vi.mocked(readStoredProperties).mockResolvedValueOnce([
      { id: "property-1", hostId: user.id, slug: "listing", title: "Listing", description: "", address: "", city: "", country: "PH", pricePerNight: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, propertyType: "house", status: "approved", rating: 0, amenities: [], rules: [], createdAt: "2026-06-18", images: [] },
    ]);
    vi.mocked(readStoredAuthTokens).mockResolvedValueOnce([
      { id: "token-1", userId: user.id, tokenHash: "hash", type: "account_deletion", expiresAt: "2026-06-19T00:00:00.000Z", createdAt: "2026-06-18T00:00:00.000Z" },
    ]);
    vi.mocked(readStoredSessions).mockResolvedValueOnce([
      { id: "session-1", userId: user.id, sessionHash: "hash", expiresAt: "2026-06-19T00:00:00.000Z", createdAt: "2026-06-18T00:00:00.000Z" },
    ]);

    await processAccountDeletion({ adminId: "admin-1", targetUserId: user.id });

    expect(writeStoredUsers).toHaveBeenCalledWith([
      expect.objectContaining({
        id: user.id,
        name: "Deleted account",
        email: "deleted-guest-1@deleted.stayprimeph.local",
        passwordHash: undefined,
      }),
    ]);
    expect(writeStoredProperties).toHaveBeenCalledWith([
      expect.objectContaining({ id: "property-1", status: "rejected" }),
    ]);
    expect(writeStoredAuthTokens).toHaveBeenCalledWith([]);
    expect(writeStoredSessions).toHaveBeenCalledWith([]);
    expect(appendAdminLog).toHaveBeenCalledWith({
      adminId: "admin-1",
      action: "account.anonymized",
      entityType: "user",
      entityId: user.id,
    });
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      actorRole: "admin",
      action: "account.anonymized",
      entityType: "user",
      entityId: user.id,
      metadata: expect.objectContaining({
        deletionVerified: true,
        deletionSlaDays: accountDeletionSlaDays,
        targetRole: "guest",
      }),
    }));
  });
});

describe("account deletion SLA workflow", () => {
  it("waits for verification before starting the admin completion SLA", () => {
    expect(deletionRequestWorkflow({
      requestedAt: "2026-06-18T00:00:00.000Z",
      verifiedAt: null,
    }, new Date("2026-06-25T00:00:00.000Z"))).toEqual({
      requestedAt: "2026-06-18T00:00:00.000Z",
      verifiedAt: null,
      dueAt: null,
      daysRemaining: null,
      status: "awaiting_verification",
    });
  });

  it("sets a 30-day admin completion target after email verification", () => {
    expect(deletionRequestWorkflow({
      requestedAt: "2026-06-18T00:00:00.000Z",
      verifiedAt: "2026-06-19T00:00:00.000Z",
    }, new Date("2026-07-01T00:00:00.000Z"))).toEqual({
      requestedAt: "2026-06-18T00:00:00.000Z",
      verifiedAt: "2026-06-19T00:00:00.000Z",
      dueAt: "2026-07-19T00:00:00.000Z",
      daysRemaining: 18,
      status: "due",
    });
  });

  it("flags verified deletion requests as overdue after the SLA date", () => {
    expect(deletionRequestWorkflow({
      requestedAt: "2026-06-18T00:00:00.000Z",
      verifiedAt: "2026-06-19T00:00:00.000Z",
    }, new Date("2026-07-20T00:00:00.000Z"))).toMatchObject({
      dueAt: "2026-07-19T00:00:00.000Z",
      daysRemaining: -1,
      status: "overdue",
    });
  });
});
