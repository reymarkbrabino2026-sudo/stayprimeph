import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-logs", () => ({
  appendAdminLog: vi.fn(),
}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));

const { cookiesMock, headersMock, redirectMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  headersMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/admin-mfa", () => ({
  clearPendingAdminMfaChallenge: vi.fn(),
  createAdminMfaCode: vi.fn(),
  createPendingAdminMfaChallenge: vi.fn(),
  isAdminMfaCodeValid: vi.fn(),
  readPendingAdminMfaChallenge: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  clearAllSessionsForUser: vi.fn(),
  clearSession: vi.fn(),
  createSession: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
  requireRole: vi.fn(async () => ({
    id: "user-1",
    role: "host",
    emailVerifiedAt: "2026-06-18T00:00:00.000Z",
  })),
  requireUser: vi.fn(),
  requireVerifiedEmail: vi.fn(),
  roleHome: vi.fn(() => "/guest/dashboard"),
  sessionMetadataFromHeaders: vi.fn(() => ({})),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth-tokens", () => ({
  completeEmailChange: vi.fn(),
  consumeAuthToken: vi.fn(),
  consumeEmailVerificationCode: vi.fn(),
  getAuthToken: vi.fn(),
  hashAuthTokenValue: vi.fn(),
  issueAuthToken: vi.fn(async () => "token"),
  markUserEmailVerified: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("@/lib/canonical-paths", () => ({
  normalizeKnownAppPath: vi.fn((path: string) => path),
}));

vi.mock("@/lib/email", () => ({
  sendAdminMfaEmail: vi.fn(),
  sendBookingConfirmedEmail: vi.fn(),
  sendBookingReceivedEmail: vi.fn(),
  sendBookingRequestEmail: vi.fn(),
  sendListingReviewEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPrivilegedMfaEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-secret-with-at-least-32-characters",
    NEXT_PUBLIC_APP_URL: "https://stayprimeph.com",
  },
}));

vi.mock("@/lib/host-wizard-data", () => ({
  amenityGroups: [],
}));

vi.mock("@/lib/host-wizard-schema", () => ({
  hostListingSchema: { safeParse: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/password-policy", () => ({
  passwordPolicyMessage: vi.fn(() => null),
}));

vi.mock("@/lib/pricing", () => ({
  calculateDefaultWeekendPrice: vi.fn((price: number) => price),
}));

vi.mock("@/lib/properties", () => ({
  getPropertyById: vi.fn(),
  revalidatePublicListingSummaries: vi.fn(),
}));

vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(async () => []),
  writeStoredProperties: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(async () => ({ limited: false })),
  checkLoginLockout: vi.fn(async () => ({ limited: false })),
  clearFailedLoginAttempts: vi.fn(),
  recordFailedLoginAttempt: vi.fn(async () => ({ limited: false })),
}));

vi.mock("@/lib/repositories", () => ({
  createPropertyInDatabase: vi.fn(),
  createUserInDatabase: vi.fn(),
  deleteDraftPropertyInDatabase: vi.fn(),
  updatePropertyDetailsInDatabase: vi.fn(),
  upsertDraftPropertyInDatabase: vi.fn(),
  updatePropertyStatusInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  hasSupabaseConfig: vi.fn(() => false),
  isGoogleAuthEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(async () => []),
  writeStoredUsers: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
  getUsers: vi.fn(async () => []),
}));

import { approveListing } from "@/app/admin/listings/actions";
import { signUp } from "@/app/auth/actions";
import { createListing } from "@/app/host/listings/actions";
import { appendAdminLog } from "@/lib/admin-logs";
import { appendAuditLog } from "@/lib/audit-logs";
import { requireRole } from "@/lib/auth";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { getPropertyById } from "@/lib/properties";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { updatePropertyStatusInDatabase } from "@/lib/repositories";
import { writeStoredUsers } from "@/lib/user-store";

function crossOriginHeaders() {
  return new Headers({
    host: "stayprimeph.com",
    origin: "https://evil.example",
  });
}

function sameOriginHeaders() {
  return new Headers({
    host: "stayprimeph.com",
    origin: "https://stayprimeph.com",
  });
}

function csrfToken(sessionToken = "session-1") {
  return createHmac("sha256", "test-secret-with-at-least-32-characters")
    .update(`csrf:${sessionToken}`)
    .digest("base64url");
}

function signupForm() {
  const formData = new FormData();
  formData.set("name", "Maria Santos");
  formData.set("email", "maria@example.com");
  formData.set("password", "PrimeStay#2026");
  formData.set("confirmPassword", "PrimeStay#2026");
  formData.set("role", "guest");
  return formData;
}

function listingForm() {
  const formData = new FormData();
  formData.set("title", "Cross-origin listing");
  formData.set("description", "This should never be created.");
  formData.set("address", "123 Street");
  formData.set("city", "Manila");
  formData.set("country", "Philippines");
  formData.set("propertyType", "House");
  formData.set("pricePerNight", "2500");
  formData.set("bedrooms", "1");
  formData.set("bathrooms", "1");
  formData.set("maxGuests", "2");
  return formData;
}

describe("cross-origin form submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(crossOriginHeaders());
    cookiesMock.mockResolvedValue({ get: () => ({ value: "session-1" }) });
  });

  it("rejects cross-origin signup forms before creating an account", async () => {
    await expect(signUp(signupForm())).rejects.toThrow("Request origin could not be verified.");

    expect(writeStoredUsers).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("rejects cross-origin host listing forms before checking role or persisting", async () => {
    await expect(createListing(listingForm())).rejects.toThrow("Request origin could not be verified.");

    expect(requireRole).not.toHaveBeenCalled();
    expect(writeStoredProperties).not.toHaveBeenCalled();
  });

  it("rejects cross-origin admin listing review forms before updating status", async () => {
    const formData = new FormData();
    formData.set("id", "property-1");

    await expect(approveListing(formData)).rejects.toThrow("Request origin could not be verified.");

    expect(requireRole).not.toHaveBeenCalled();
    expect(updatePropertyStatusInDatabase).not.toHaveBeenCalled();
  });

  it("rejects admin approval when listing images are not host-scoped uploads", async () => {
    headersMock.mockResolvedValue(sameOriginHeaders());
    vi.mocked(getPropertyById).mockResolvedValueOnce({
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
      status: "pending",
      rating: 0,
      amenities: [],
      rules: [],
      createdAt: "2026-06-18",
      images: [{ id: "placeholder", propertyId: "property-1", imageUrl: "pending-upload", tone: "" }],
    });
    const formData = new FormData();
    formData.set("id", "property-1");
    formData.set("csrfToken", csrfToken());

    await expect(approveListing(formData)).rejects.toThrow("Listing images must be uploaded through StayPrimePH before approval.");

    expect(updatePropertyStatusInDatabase).not.toHaveBeenCalled();
    expect(writeStoredProperties).not.toHaveBeenCalled();
  });

  it("persists an audit log when an admin approves a listing", async () => {
    headersMock.mockResolvedValue(sameOriginHeaders());
    vi.mocked(requireRole).mockResolvedValueOnce({
      id: "admin-1",
      role: "admin",
      emailVerifiedAt: "2026-06-18T00:00:00.000Z",
    } as Awaited<ReturnType<typeof requireRole>>);
    vi.mocked(getPropertyById).mockResolvedValueOnce({
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
      status: "pending",
      rating: 0,
      amenities: [],
      rules: [],
      createdAt: "2026-06-18",
      images: [{ id: "image-1", propertyId: "property-1", imageUrl: "/uploads/listings/host-1/property-1/cover.jpg", tone: "" }],
    });
    vi.mocked(readStoredProperties).mockResolvedValueOnce([
      { id: "property-1", hostId: "host-1", slug: "listing", title: "Listing", description: "A listing", address: "123 Street", city: "Manila", country: "Philippines", pricePerNight: 2500, bedrooms: 1, bathrooms: 1, maxGuests: 2, propertyType: "House", status: "pending", rating: 0, amenities: [], rules: [], createdAt: "2026-06-18", images: [] },
    ]);
    const formData = new FormData();
    formData.set("id", "property-1");
    formData.set("csrfToken", csrfToken());

    await approveListing(formData);

    expect(writeStoredProperties).toHaveBeenCalledWith([
      expect.objectContaining({ id: "property-1", status: "approved" }),
    ]);
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      actorRole: "admin",
      action: "listing.approved",
      entityType: "property",
      entityId: "property-1",
      metadata: expect.objectContaining({
        hostId: "host-1",
        previousStatus: "pending",
        nextStatus: "approved",
      }),
    }));
    expect(appendAdminLog).toHaveBeenCalledWith({
      adminId: "admin-1",
      action: "listing.approved",
      entityType: "property",
      entityId: "property-1",
    });
  });
});
