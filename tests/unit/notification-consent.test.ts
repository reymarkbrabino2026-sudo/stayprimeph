import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  prisma: {
    accountSettings: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    PERSISTENCE_DRIVER: "json",
  },
}));

vi.mock("@/lib/json-store", () => ({
  readJsonStore: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUsers: vi.fn(),
}));

import { isNotificationEmailAllowed } from "@/lib/notification-consent";
import { readJsonStore } from "@/lib/json-store";
import { getUsers } from "@/lib/users";

const user = {
  id: "user-1",
  name: "Prime User",
  email: "user@example.com",
  role: "guest",
  avatar: "PU",
  phone: "",
  createdAt: "2026-06-18",
} as const;

function mockSettings(notifications: unknown) {
  vi.mocked(getUsers).mockResolvedValue([user]);
  vi.mocked(readJsonStore).mockResolvedValue([{ userId: user.id, notifications }]);
}

describe("notification consent enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUsers).mockResolvedValue([user]);
    vi.mocked(readJsonStore).mockResolvedValue([]);
  });

  it("always allows essential account and security emails", async () => {
    mockSettings({
      account: { unsubscribed: true, preferences: { "Reservations:Booking requests": { email: false, push: false, sms: false } } },
      offers: { unsubscribed: true, preferences: {} },
    });

    await expect(isNotificationEmailAllowed({
      to: user.email,
      kind: "essential",
      scope: "account",
      preferenceId: "Reservations:Booking requests",
    })).resolves.toBe(true);
  });

  it("suppresses account emails when the matching email channel is off", async () => {
    mockSettings({
      account: {
        unsubscribed: false,
        preferences: {
          "Reservations:Booking requests": { email: false, push: true, sms: false },
        },
      },
    });

    await expect(isNotificationEmailAllowed({
      to: user.email,
      kind: "account",
      scope: "account",
      preferenceId: "Reservations:Booking requests",
    })).resolves.toBe(false);
  });

  it("allows account emails by default when no saved preference exists", async () => {
    mockSettings({ account: { unsubscribed: false, preferences: {} } });

    await expect(isNotificationEmailAllowed({
      to: user.email,
      kind: "account",
      scope: "account",
      preferenceId: "Hosting:Listing status",
    })).resolves.toBe(true);
  });

  it("suppresses account emails when the account notification scope is unsubscribed", async () => {
    mockSettings({ account: { unsubscribed: true, preferences: {} } });

    await expect(isNotificationEmailAllowed({
      to: user.email,
      kind: "account",
      scope: "account",
      preferenceId: "Hosting:Listing status",
    })).resolves.toBe(false);
  });

  it("requires explicit email opt-in for marketing emails", async () => {
    mockSettings({
      offers: {
        unsubscribed: false,
        preferences: {
          "StayPrimePH updates:News and programs": { email: true, push: false, sms: false },
        },
      },
    });

    await expect(isNotificationEmailAllowed({
      to: user.email,
      kind: "marketing",
      scope: "offers",
      preferenceId: "StayPrimePH updates:News and programs",
    })).resolves.toBe(true);

    await expect(isNotificationEmailAllowed({
      to: user.email,
      kind: "marketing",
      scope: "offers",
      preferenceId: "Travel tips and offers:Inspiration and offers",
    })).resolves.toBe(false);
  });
});
