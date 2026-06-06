import { expect, test } from "@playwright/test";

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login?role=admin", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill("admin@stayprimeph.com");
  await page.getByPlaceholder("Password").fill("Admin123!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 30000 });
}

test("admin can open the approval queue", async ({ page }) => {
  await signInAsAdmin(page);
  await expect(page.getByText("Listings waiting for review")).toBeVisible();
});

const adminScreens = [
  ["/admin/dashboard", "Admin Overview"],
  ["/admin/users", "Users"],
  ["/admin/hosts", "Hosts"],
  ["/admin/listings", "Listings Approval"],
  ["/admin/bookings", "Bookings"],
  ["/admin/payments", "Payments"],
  ["/admin/reports", "Reports"],
  ["/admin/reviews", "Reviews"],
  ["/admin/disputes", "Disputes"],
  ["/admin/settings", "System Settings"],
] as const;

test("admin can render every admin screen", async ({ page }) => {
  await signInAsAdmin(page);

  for (const [path, heading] of adminScreens) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});
