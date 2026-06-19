import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("host draft cleanup wiring", () => {
  test("wizard publishing keeps the cleanup marker route", async () => {
    const source = await readFile("app/host/listings/actions.ts", "utf8");
    const wizard = await readFile("components/host-wizard/host-listing-wizard.tsx", "utf8");

    expect(source).toContain('export async function publishWizardListing');
    expect(wizard).toContain('router.push("/host/listings?published=1")');
  });

  test("fresh wizard URL marker is removed after initialization", async () => {
    const source = await readFile("components/host-wizard/host-listing-wizard.tsx", "utf8");

    expect(source).toContain('url.searchParams.delete("new")');
    expect(source).toContain("window.history.replaceState");
  });

  test("map pin confirmation advances from location step", async () => {
    const source = await readFile("components/host-wizard/map-selector.tsx", "utf8");

    expect(source).toContain('if (currentStep === "location") setStep("visibility");');
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
