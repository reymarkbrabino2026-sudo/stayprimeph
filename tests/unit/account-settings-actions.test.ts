import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/account-settings", () => ({
  saveBookingPermissions: vi.fn(),
  saveFinancialSettings: vi.fn(async (_user, financial) => financial),
  saveLocalizationPreferences: vi.fn(async (_user, localization) => localization),
  saveNotificationSettings: vi.fn(),
  savePersonalInfo: vi.fn(),
  savePrivacySettings: vi.fn(),
  saveProfessionalHostingTools: vi.fn(),
  saveWorkTravelProfile: vi.fn(),
}));

vi.mock("@/lib/account-deletion", () => ({
  requestAccountDeletion: vi.fn(),
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

import { requestAccountDeletionAction, requestUserDataExportAction, saveFinancialSettingsAction, saveLocalizationPreferencesAction, verifyFinancialSettingsStepUpAction } from "@/app/account-settings/actions";
import { defaultFinancialSettings, defaultLocalizationPreferences } from "@/lib/account-settings-types";
import { saveFinancialSettings, saveLocalizationPreferences } from "@/lib/account-settings";
import { requestAccountDeletion } from "@/lib/account-deletion";
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

  it("blocks host financial changes for social sign-in users until they set a password", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ ...hostUser, passwordHash: undefined });

    const result = await saveFinancialSettingsAction(defaultFinancialSettings, "google-password");

    expect(result).toEqual({ ok: false, error: "Set a password before changing payment or payout settings." });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(saveFinancialSettings).not.toHaveBeenCalled();
  });

  it("saves host financial changes after a valid current password", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(hostUser);
    vi.mocked(verifyPassword).mockReturnValueOnce(true);

    const result = await saveFinancialSettingsAction(defaultFinancialSettings, "correct-password");

    expect(result).toEqual({ ok: true, data: defaultFinancialSettings });
    expect(saveFinancialSettings).toHaveBeenCalledWith(hostUser, defaultFinancialSettings);
  });

  it("blocks payout setup when the current password is wrong", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(hostUser);
    vi.mocked(verifyPassword).mockReturnValueOnce(false);

    const result = await verifyFinancialSettingsStepUpAction("wrong-password");

    expect(result).toEqual({ ok: false, error: "Current password is incorrect." });
    expect(verifyPassword).toHaveBeenCalledWith("wrong-password", "hash");
  });

  it("blocks payout setup for social sign-in users until they set a password", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ ...hostUser, passwordHash: undefined });

    const result = await verifyFinancialSettingsStepUpAction("google-password");

    expect(result).toEqual({ ok: false, error: "Set a password before changing payment or payout settings." });
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("allows payout setup after a valid current password", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(hostUser);
    vi.mocked(verifyPassword).mockReturnValueOnce(true);

    const result = await verifyFinancialSettingsStepUpAction("correct-password");

    expect(result).toEqual({ ok: true, data: { verified: true } });
  });

  it("does not require host step-up for guest financial settings", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(guestUser);

    const result = await saveFinancialSettingsAction(defaultFinancialSettings);

    expect(result).toEqual({ ok: true, data: defaultFinancialSettings });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(saveFinancialSettings).toHaveBeenCalledWith(guestUser, defaultFinancialSettings);
  });
});

describe("localization settings action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves language and currency preferences for the current user", async () => {
    const localization = {
      ...defaultLocalizationPreferences,
      language: "Filipino",
      currency: "US dollar (USD)",
    };
    vi.mocked(requireUser).mockResolvedValueOnce(guestUser);

    const result = await saveLocalizationPreferencesAction(localization);

    expect(result).toEqual({ ok: true, data: localization });
    expect(saveLocalizationPreferences).toHaveBeenCalledWith(guestUser, localization);
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

describe("account deletion request action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a verified email before requesting account deletion", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ ...guestUser, emailVerifiedAt: undefined });

    const result = await requestAccountDeletionAction();

    expect(result).toEqual({ ok: false, error: "Verify your email address before using this feature." });
    expect(requestAccountDeletion).not.toHaveBeenCalled();
  });

  it("sends a deletion verification request for verified users", async () => {
    const deletionRequest = { requestedAt: "2026-06-18T00:00:00.000Z" };
    vi.mocked(requireUser).mockResolvedValueOnce(guestUser);
    vi.mocked(requestAccountDeletion).mockResolvedValueOnce(deletionRequest);

    const result = await requestAccountDeletionAction();

    expect(result).toEqual({ ok: true, data: deletionRequest });
    expect(requestAccountDeletion).toHaveBeenCalledWith(guestUser);
  });
});
