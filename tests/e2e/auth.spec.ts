import { expect, test } from "@playwright/test";
import { cleanupUserByEmail, expectNoSignedInSession, markUserEmailVerified } from "./helpers/auth";

const guestPassword = "IslandTrip#2026";

test("guest can sign in and reach the guest dashboard", async ({ page }) => {
  const email = `guest-${Date.now()}@example.com`;
  try {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Full name").fill("E2E Guest");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(guestPassword);
    await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill(guestPassword);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/verify-email\?/);
    await expect(page.getByText("We sent a 6-digit verification code")).toBeVisible();
    await expectNoSignedInSession(page);

    await markUserEmailVerified(email);

    await page.goto("/login?role=guest", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(guestPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/guest\/dashboard$/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Guest Overview", exact: true })).toBeVisible();
  } finally {
    await cleanupUserByEmail(email);
  }
});

test("signup rejects weak guest passwords", async ({ page }) => {
  const email = `guest-weak-${Date.now()}@example.com`;
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Full name").fill("E2E Guest");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("Password1234!");
  await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill("Password1234!");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/register\?error=/);
  await expect(page.getByText("Use a stronger password")).toBeVisible();
  await expectNoSignedInSession(page);
});
