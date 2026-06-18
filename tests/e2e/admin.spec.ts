import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const checkoutPropertyId = process.env.E2E_APPROVED_PROPERTY_ID;

async function signInAsAdmin(page: import("@playwright/test").Page) {
  test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for admin E2E tests.");
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill(adminEmail!);
  await page.getByPlaceholder("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 30000 });
}

test("admin pages send signed-out users to admin login", async ({ page }) => {
  await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});

test("shared admin login URL forwards to admin login", async ({ page }) => {
  await page.goto("/login?role=admin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});

test("admin can open the approval queue", async ({ page }) => {
  await signInAsAdmin(page);
  await expect(page.getByText("Listings waiting for review")).toBeVisible();
});

test("admin can open host reports from old ERP URL", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/host/erp", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/host\/reports$/);
  await expect(page.getByRole("heading", { name: "Host Reports", exact: true })).toBeVisible();
  await expect(page.getByText("Open reservations")).toBeVisible();
});

test("admin sees guest-account warning on checkout instead of app error", async ({ page }) => {
  test.skip(!checkoutPropertyId, "Set E2E_APPROVED_PROPERTY_ID to run checkout authorization coverage.");
  await signInAsAdmin(page);
  await page.goto(`/bookings/checkout/${checkoutPropertyId}?checkIn=2026-06-14&checkOut=2026-06-18&guests=1`, { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Use a guest account to request this stay.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request to book" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Something went sideways" })).toHaveCount(0);
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
