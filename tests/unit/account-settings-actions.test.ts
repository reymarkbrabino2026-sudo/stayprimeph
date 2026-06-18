import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/account-settings", () => ({
  saveBookingPermissions: vi.fn(),
  saveFinancialSettings: vi.fn(async (_user, financial) => financial),
  saveNotificationSettings: vi.fn(),
  savePersonalInfo: vi.fn(),
  savePrivacySettings: vi.fn(),
  saveProfessionalHostingTools: vi.fn(),
  saveWorkTravelProfile: vi.fn(),
}));

vi.mock("@/lib/user-data-export", () => ({
  requestUserDataExport: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
  requireVerifiedEmail: vi.fn((user: { emailVerifiedAt?: string }) => {
    if (!user.emailVerifiedAt) throw new Error("Verify your email address before using this feature.");
  }),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: vi.fn(),
}));

import { requestUserDataExportAction, saveFinancialSettingsAction } from "@/app/account-settings/actions";
import { defaultFinancialSettings } from "@/lib/account-settings-types";
import { saveFinancialSettings } from "@/lib/account-settings";
import { requireUser, verifyPassword } from "@/lib/auth";
import { requestUserDataExport } from "@/lib/user-data-export";
import type { User } from "@/lib/types";

const hostUser: User = {
  id: "host-1",
  name: "Host User",
  email: "host@example.com",
  role: "host",
  avatar: "HU",
  phone: "",
  createdAt: "2026-06-18",
  passwordHash: "hash",
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
};

const guestUser: User = {
  ...hostUser,
  id: "guest-1",
  role: "guest",
};

describe("financial settings step-up auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks host financial changes without current-password step-up", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(hostUser);

    const result = await saveFinancialSettingsAction(defaultFinancialSettings);

    expect(result).toEqual({ ok: false, error: "Enter your current password before changing payment or payout settings." });
    expect(saveFinancialSettings).not.toHaveBeenCalled();
  });

  it("blocks host financial changes when the current password is wrong", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(hostUser);
    vi.mocked(verifyPassword).mockReturnValueOnce(false);

    const result = await saveFinancialSettingsAction(defaultFinancialSettings, "wrong-password");

    expect(result).toEqual({ ok: false, error: "Current password is incorrect." });
    expect(verifyPassword).toHaveBeenCalledWith("wrong-password", "hash");
    expect(saveFinancialSettings).not.toHaveBeenCalled();
  });

  it("saves host financial changes after a valid current password", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(hostUser);
    vi.mocked(verifyPassword).mockReturnValueOnce(true);

    const result = await saveFinancialSettingsAction(defaultFinancialSettings, "correct-password");

    expect(result).toEqual({ ok: true, data: defaultFinancialSettings });
    expect(saveFinancialSettings).toHaveBeenCalledWith(hostUser, defaultFinancialSettings);
  });

  it("does not require host step-up for guest financial settings", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(guestUser);

    const result = await saveFinancialSettingsAction(defaultFinancialSettings);

    expect(result).toEqual({ ok: true, data: defaultFinancialSettings });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(saveFinancialSettings).toHaveBeenCalledWith(guestUser, defaultFinancialSettings);
  });
});

describe("account data export action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a verified email before exporting account data", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ ...guestUser, emailVerifiedAt: undefined });

    const result = await requestUserDataExportAction();

    expect(result).toEqual({ ok: false, error: "Verify your email address before using this feature." });
    expect(requestUserDataExport).not.toHaveBeenCalled();
  });

  it("returns a generated export for verified users", async () => {
    const exportResult = {
      filename: "stayprimeph-data-export-guest-1-2026-06-18.json",
      contentType: "application/json",
      data: { generatedAt: "2026-06-18T00:00:00.000Z" },
    };
    vi.mocked(requireUser).mockResolvedValueOnce(guestUser);
    vi.mocked(requestUserDataExport).mockResolvedValueOnce(exportResult as Awaited<ReturnType<typeof requestUserDataExport>>);

    const result = await requestUserDataExportAction();

    expect(result).toEqual({ ok: true, data: exportResult });
    expect(requestUserDataExport).toHaveBeenCalledWith(guestUser);
  });
});
