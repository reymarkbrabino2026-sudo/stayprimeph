import { expect, test } from "@playwright/test";

test("guest can sign in and reach the guest dashboard", async ({ page }) => {
  const email = `guest-${Date.now()}@example.com`;
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Full name").fill("E2E Guest");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("Guest123!");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/guest\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Guest Overview", exact: true })).toBeVisible();
});
