import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => blob);

describe("readJsonStore", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.JSON_STORE_BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_token";
  });

  it("falls back to bundled data when blob reads fail", async () => {
    blob.get.mockRejectedValueOnce(new Error("blob unavailable"));

    const { readJsonStore } = await import("@/lib/json-store");

    await expect(readJsonStore("host-expenses.json")).resolves.toEqual([]);
  });

  it("does not fail reads when seeding a missing blob fails", async () => {
    blob.get.mockResolvedValueOnce(null);
    blob.put.mockRejectedValueOnce(new Error("cannot seed"));

    const { readJsonStore } = await import("@/lib/json-store");

    await expect(readJsonStore("host-expenses.json")).resolves.toEqual([]);
    expect(blob.put).toHaveBeenCalled();
  });

  it("does not use the listing photo blob token for JSON persistence", async () => {
    delete process.env.JSON_STORE_BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_photo_token";

    const { readJsonStore } = await import("@/lib/json-store");

    await expect(readJsonStore("host-expenses.json")).resolves.toEqual([]);
    expect(blob.get).not.toHaveBeenCalled();
  });
});
