import { expect, test } from "@playwright/test";

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill("admin@stayprimeph.com");
  await page.getByPlaceholder("Password").fill("Admin123!");
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

test("admin can open host ERP", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/host/erp", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "ERP Hospitality Management", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservation management" })).toBeVisible();
});

test("admin sees guest-account warning on checkout instead of app error", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/bookings/checkout/42b8ae68-c9df-45f6-80c4-93a31e935c66?checkIn=2026-06-14&checkOut=2026-06-18&guests=1", { waitUntil: "domcontentloaded" });

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
