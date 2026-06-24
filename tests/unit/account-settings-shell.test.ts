import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { accountSettingsDoneHref } from "@/components/account/settings-shell";

describe("accountSettingsDoneHref", () => {
  test("routes Done back to the correct side of the app", () => {
    expect(accountSettingsDoneHref("guest")).toBe("/guest/profile");
    expect(accountSettingsDoneHref("host")).toBe("/host/profile");
    expect(accountSettingsDoneHref("admin")).toBe("/admin/dashboard");
    expect(accountSettingsDoneHref()).toBe("/guest/profile");
  });
});
