import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
  },
}));
vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
}));
vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
}));
vi.mock("@/lib/auth-tokens", () => ({
  issueAuthToken: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmailChangeVerificationEmail: vi.fn(),
}));
vi.mock("@/lib/json-store", () => ({
  readJsonStore: vi.fn(),
  writeJsonStore: vi.fn(),
}));
vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(),
  writeStoredUsers: vi.fn(),
}));

import { saveFinancialSettings, getAccountSettings, savePersonalInfo } from "@/lib/account-settings";
import { defaultFinancialSettings } from "@/lib/account-settings-types";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

const user = {
  id: "user-1",
  name: "Tax User",
  email: "tax@example.test",
  role: "host",
  avatar: "TU",
  phone: "",
  createdAt: "2026-06-18",
} satisfies User;

describe("sensitive financial identifier protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores taxpayer and VAT identifiers as masked tokenized values", async () => {
    vi.mocked(readJsonStore)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await saveFinancialSettings(user, {
      ...defaultFinancialSettings,
      taxpayer: {
        legalName: "Tax User",
        country: "Philippines",
        taxId: "123-456-789",
        address: "Manila",
      },
      vat: {
        businessName: "Tax User Holdings",
        country: "Philippines",
        vatId: "VAT-987-654",
      },
    });

    expect(result.taxpayer?.taxId).toBe("**** 6789");
    expect(result.vat?.vatId).toBe("**** 7654");

    const stored = vi.mocked(writeJsonStore).mock.calls.at(-1)?.[1][0] as {
      financial: {
        taxpayer: Record<string, string>;
        vat: Record<string, string>;
      };
    };
    expect(stored.financial.taxpayer.taxId).toBe("**** 6789");
    expect(stored.financial.taxpayer.taxIdToken).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.financial.taxpayer.taxIdLast4).toBe("6789");
    expect(stored.financial.vat.vatId).toBe("**** 7654");
    expect(stored.financial.vat.vatIdToken).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain("123-456-789");
    expect(JSON.stringify(stored)).not.toContain("VAT-987-654");
  });

  it("remediates legacy plaintext tax IDs on read", async () => {
    vi.mocked(readJsonStore).mockResolvedValueOnce([
      {
        userId: user.id,
        financial: {
          ...defaultFinancialSettings,
          taxpayer: {
            legalName: "Tax User",
            country: "Philippines",
            taxId: "987-654-321",
            address: "Manila",
          },
        },
      },
    ]);

    const result = await getAccountSettings(user);

    expect(result.financial.taxpayer?.taxId).toBe("**** 4321");
    const remediated = vi.mocked(writeJsonStore).mock.calls[0][1][0] as {
      financial: { taxpayer: Record<string, string> };
    };
    expect(remediated.financial.taxpayer.taxId).toBe("**** 4321");
    expect(remediated.financial.taxpayer.taxIdToken).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(remediated)).not.toContain("987-654-321");
  });

  it("stores payout identifiers as masked tokenized values", async () => {
    vi.mocked(readJsonStore)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await saveFinancialSettings(user, {
      ...defaultFinancialSettings,
      payoutMethods: [
        {
          id: "payout-1",
          type: "GCash",
          accountName: "Tax User",
          bankName: "09171234567",
          accountLast4: "4567",
          currency: "PHP",
        },
      ],
    });

    expect(result.payoutMethods[0].accountLast4).toBe("**** 4567");
    const stored = vi.mocked(writeJsonStore).mock.calls.at(-1)?.[1][0] as {
      financial: { payoutMethods: Array<Record<string, string>> };
    };
    expect(stored.financial.payoutMethods[0].accountLast4).toBe("**** 4567");
    expect(stored.financial.payoutMethods[0].accountLast4Token).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.financial.payoutMethods[0].accountLast4Last4).toBe("4567");
    expect(JSON.stringify(stored)).not.toContain("\"accountLast4\":\"4567\"");
  });

  it("remediates legacy plaintext payout identifiers on read", async () => {
    vi.mocked(readJsonStore).mockResolvedValueOnce([
      {
        userId: user.id,
        financial: {
          ...defaultFinancialSettings,
          payoutMethods: [
            {
              id: "payout-1",
              type: "Bank account",
              accountName: "Tax User",
              bankName: "Test Bank",
              accountLast4: "9876",
              currency: "PHP",
            },
          ],
        },
      },
    ]);

    const result = await getAccountSettings(user);

    expect(result.financial.payoutMethods[0].accountLast4).toBe("**** 9876");
    const remediated = vi.mocked(writeJsonStore).mock.calls[0][1][0] as {
      financial: { payoutMethods: Array<Record<string, string>> };
    };
    expect(remediated.financial.payoutMethods[0].accountLast4).toBe("**** 9876");
    expect(remediated.financial.payoutMethods[0].accountLast4Token).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(remediated)).not.toContain("\"accountLast4\":\"9876\"");
  });

  it("minimizes payment billing postal codes and taxpayer addresses on save", async () => {
    vi.mocked(readJsonStore)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await saveFinancialSettings(user, {
      ...defaultFinancialSettings,
      paymentMethods: [
        {
          id: "card-1",
          cardholder: "Tax User",
          brand: "Visa",
          last4: "4242",
          expiry: "12/30",
          billingZip: "1000",
        },
      ],
      taxpayer: {
        legalName: "Tax User",
        country: "Philippines",
        taxId: "123456789",
        address: "123 Sensitive Street, Manila",
      },
    });

    expect(result.paymentMethods[0].billingZip).toBe("");
    expect(result.taxpayer?.address).toBe("Provided");

    const stored = vi.mocked(writeJsonStore).mock.calls.at(-1)?.[1][0] as {
      financial: {
        paymentMethods: Array<Record<string, unknown>>;
        taxpayer: Record<string, unknown>;
      };
    };
    expect(stored.financial.paymentMethods[0].billingZip).toBe("");
    expect(stored.financial.paymentMethods[0].billingZipProvided).toBe(false);
    expect(stored.financial.taxpayer.address).toBe("Provided");
    expect(stored.financial.taxpayer.addressProvided).toBe(true);
    expect(JSON.stringify(stored)).not.toContain("1000");
    expect(JSON.stringify(stored)).not.toContain("123 Sensitive Street");
  });

  it("remediates legacy stored address data on read", async () => {
    vi.mocked(readJsonStore).mockResolvedValueOnce([
      {
        userId: user.id,
        financial: {
          ...defaultFinancialSettings,
          paymentMethods: [
            {
              id: "card-1",
              cardholder: "Tax User",
              brand: "Visa",
              last4: "4242",
              expiry: "12/30",
              billingZip: "1000",
            },
          ],
          taxpayer: {
            legalName: "Tax User",
            country: "Philippines",
            taxId: "123456789",
            address: "123 Sensitive Street, Manila",
          },
        },
      },
    ]);

    const result = await getAccountSettings(user);

    expect(result.financial.paymentMethods[0].billingZip).toBe("");
    expect(result.financial.taxpayer?.address).toBe("Provided");

    const remediated = vi.mocked(writeJsonStore).mock.calls[0][1][0] as {
      financial: {
        paymentMethods: Array<Record<string, unknown>>;
        taxpayer: Record<string, unknown>;
      };
    };
    expect(remediated.financial.paymentMethods[0].billingZip).toBe("");
    expect(remediated.financial.paymentMethods[0].billingZipProvided).toBe(false);
    expect(remediated.financial.taxpayer.address).toBe("Provided");
    expect(JSON.stringify(remediated)).not.toContain("1000");
    expect(JSON.stringify(remediated)).not.toContain("123 Sensitive Street");
  });
});

describe("personal identity data minimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not duplicate account identity or address details in account settings storage", async () => {
    vi.mocked(readJsonStore)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(readStoredUsers).mockResolvedValueOnce([user]);

    await savePersonalInfo(user, {
      legalName: "Updated Legal Name",
      preferredName: "Tax",
      email: user.email,
      phone: "+63 917 000 0000",
      identity: "Government ID submitted with raw reference",
      residentialAddress: "123 Sensitive Street, Manila",
      mailingAddress: "PO Box 123, Manila",
      emergencyContact: "Relative +63 900 000 0000",
    });

    expect(writeStoredUsers).toHaveBeenCalled();
    const stored = vi.mocked(writeJsonStore).mock.calls.at(-1)?.[1][0] as {
      personalInfo: Record<string, string>;
    };
    expect(stored.personalInfo).toEqual({
      preferredName: "Tax",
      identity: "Provided",
      residentialAddress: "Provided",
      mailingAddress: "Provided",
      emergencyContact: "Provided",
    });
    expect(JSON.stringify(stored.personalInfo)).not.toContain("Updated Legal Name");
    expect(JSON.stringify(stored.personalInfo)).not.toContain("+63 917");
    expect(JSON.stringify(stored.personalInfo)).not.toContain("123 Sensitive Street");
    expect(JSON.stringify(stored.personalInfo)).not.toContain("Relative");
  });

  it("remediates legacy personal identity and address details on read", async () => {
    vi.mocked(readJsonStore).mockResolvedValueOnce([
      {
        userId: user.id,
        personalInfo: {
          legalName: "Legacy Legal Name",
          preferredName: "Tax",
          email: "legacy@example.test",
          phone: "+63 917 000 0000",
          identity: "Government ID 12345",
          residentialAddress: "123 Sensitive Street, Manila",
          mailingAddress: "PO Box 123, Manila",
          emergencyContact: "Relative +63 900 000 0000",
        },
      },
    ]);

    const result = await getAccountSettings(user);

    expect(result.personalInfo.legalName).toBe(user.name);
    expect(result.personalInfo.email).toBe(user.email);
    expect(result.personalInfo.phone).toBe(user.phone);
    expect(result.personalInfo.identity).toBe("Provided");
    expect(result.personalInfo.residentialAddress).toBe("Provided");

    const remediated = vi.mocked(writeJsonStore).mock.calls[0][1][0] as {
      personalInfo: Record<string, string>;
    };
    expect(remediated.personalInfo).toEqual({
      preferredName: "Tax",
      identity: "Provided",
      residentialAddress: "Provided",
      mailingAddress: "Provided",
      emergencyContact: "Provided",
    });
    expect(JSON.stringify(remediated.personalInfo)).not.toContain("Legacy Legal Name");
    expect(JSON.stringify(remediated.personalInfo)).not.toContain("legacy@example.test");
    expect(JSON.stringify(remediated.personalInfo)).not.toContain("123 Sensitive Street");
  });
});
