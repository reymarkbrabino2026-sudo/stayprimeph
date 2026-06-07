import { expect, test } from "@playwright/test";

test("guest can sign in and reach the guest dashboard", async ({ page }) => {
  await page.goto("/login?role=guest", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill("guest@stayprimeph.com");
  await page.getByPlaceholder("Password").fill("Guest123!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/guest\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Guest Overview", exact: true })).toBeVisible();
});
