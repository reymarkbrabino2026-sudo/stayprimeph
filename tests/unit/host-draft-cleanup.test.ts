import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("host draft cleanup wiring", () => {
  test("wizard publishing redirects with a cleanup marker", async () => {
    const source = await readFile("app/host/listings/actions.ts", "utf8");

    expect(source).toContain('export async function publishWizardListing');
    expect(source).toContain('redirect("/host/listings?published=1")');
  });

  test("host listings page clears the draft after a successful wizard publish", async () => {
    const source = await readFile("app/host/listings/page.tsx", "utf8");

    expect(source).toContain('import { HostDraftCleaner } from "@/components/host-wizard/host-draft-cleaner"');
    expect(source).toContain('<HostDraftCleaner enabled={query.published === "1"} userId={user?.id} />');
  });

  test("logout flows clear all stored host wizard drafts", async () => {
    const logoutButton = await readFile("components/auth/logout-button.tsx", "utf8");
    const travellerMenu = await readFile("components/public/traveller-menu.tsx", "utf8");

    expect(logoutButton).toContain('import { clearStoredHostWizardDraft } from "@/stores/host-wizard-store"');
    expect(logoutButton).toContain("clearStoredHostWizardDraft()");
    expect(travellerMenu).toContain('import { clearStoredHostWizardDraft } from "@/stores/host-wizard-store"');
    expect(travellerMenu).toContain("clearStoredHostWizardDraft()");
  });
});
