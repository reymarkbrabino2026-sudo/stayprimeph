import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    PERSISTENCE_DRIVER: "json",
  },
}));
vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));
vi.mock("@/lib/json-store", () => ({
  readJsonStore: vi.fn(),
  writeJsonStore: vi.fn(),
}));

import { enforceDataRetention } from "@/lib/data-retention";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";

function storeData() {
  return {
    "users.json": [
      { id: "admin-1", name: "Admin", email: "admin@example.test", role: "admin", avatar: "", phone: "", createdAt: "2026-01-01" },
      { id: "guest-1", name: "Guest", email: "guest@example.test", role: "guest", avatar: "", phone: "", createdAt: "2026-01-01" },
      { id: "host-1", name: "Host", email: "host@example.test", role: "host", avatar: "", phone: "", createdAt: "2026-01-01" },
    ],
    "messages.json": [
      { id: "support-old", senderId: "guest-1", receiverId: "admin-1", message: "old support", createdAt: "2025-05-01T00:00:00.000Z" },
      { id: "support-fresh", senderId: "admin-1", receiverId: "guest-1", message: "fresh support", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "message-old", senderId: "guest-1", receiverId: "host-1", message: "old message", createdAt: "2023-12-01T00:00:00.000Z" },
      { id: "message-fresh", senderId: "guest-1", receiverId: "host-1", message: "fresh message", createdAt: "2025-01-01T00:00:00.000Z" },
    ],
    "reports.json": [
      { id: "closed-old", type: "safety", status: "closed", details: "old", createdAt: "2022-01-01T00:00:00.000Z" },
      { id: "open-old", type: "safety", status: "open", details: "still active", createdAt: "2022-01-01T00:00:00.000Z" },
    ],
    "admin-logs.json": [
      { id: "admin-old", createdAt: "2025-01-01T00:00:00.000Z" },
      { id: "admin-fresh", createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    "audit-logs.json": [
      { id: "audit-old", actorId: "admin-1", actorRole: "admin", action: "payment.approved", entityType: "payment", entityId: "payment-1", createdAt: "2018-01-01T00:00:00.000Z" },
      { id: "audit-fresh", actorId: "admin-1", actorRole: "admin", action: "payment.rejected", entityType: "payment", entityId: "payment-2", createdAt: "2025-01-01T00:00:00.000Z" },
    ],
    "properties.json": [
      { id: "draft-old", hostId: "host-1", slug: "draft-old", title: "Old draft", description: "", address: "", city: "", country: "PH", pricePerNight: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, propertyType: "house", status: "draft", rating: 0, amenities: [], rules: [], createdAt: "2026-04-01T00:00:00.000Z", images: [] },
      { id: "pending-old", hostId: "host-1", slug: "pending-old", title: "Pending", description: "", address: "", city: "", country: "PH", pricePerNight: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, propertyType: "house", status: "pending", rating: 0, amenities: [], rules: [], createdAt: "2026-04-01T00:00:00.000Z", images: [] },
      { id: "draft-fresh", hostId: "host-1", slug: "draft-fresh", title: "Fresh draft", description: "", address: "", city: "", country: "PH", pricePerNight: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, propertyType: "house", status: "draft", rating: 0, amenities: [], rules: [], createdAt: "2026-06-01T00:00:00.000Z", images: [] },
    ],
  } satisfies Record<string, unknown[]>;
}

describe("data retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prunes expired messages, support records, logs, and unpublished drafts", async () => {
    const stores: Record<string, unknown[]> = storeData();
    vi.mocked(readJsonStore).mockImplementation(async (fileName) => stores[fileName] ?? []);

    const result = await enforceDataRetention(new Date("2026-06-18T00:00:00.000Z"));

    expect(result).toEqual({
      messages: 1,
      supportMessages: 1,
      supportReports: 1,
      adminLogs: 1,
      auditLogs: 1,
      unpublishedDrafts: 1,
    });

    const writes = new Map(vi.mocked(writeJsonStore).mock.calls.map(([fileName, records]) => [fileName, records as Array<{ id: string }>]));
    expect(writes.get("messages.json")?.map((item) => item.id)).toEqual(["support-fresh", "message-fresh"]);
    expect(writes.get("reports.json")?.map((item) => item.id)).toEqual(["open-old"]);
    expect(writes.get("admin-logs.json")?.map((item) => item.id)).toEqual(["admin-fresh"]);
    expect(writes.get("audit-logs.json")?.map((item) => item.id)).toEqual(["audit-fresh"]);
    expect(writes.get("properties.json")?.map((item) => item.id)).toEqual(["pending-old", "draft-fresh"]);
  });
});
