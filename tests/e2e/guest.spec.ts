import { expect, test } from "@playwright/test";

async function signInAsGuest(page: import("@playwright/test").Page) {
  await page.goto("/login?role=guest", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill("guest@stayprimeph.com");
  await page.getByPlaceholder("Password").fill("Guest123!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/guest\/dashboard$/);
}

const guestScreens = [
  ["/guest/dashboard", "Guest Overview"],
  ["/guest/bookings", "My Bookings"],
  ["/guest/messages", "Messages"],
  ["/guest/wishlist", "Wishlist"],
  ["/guest/reviews", "Reviews"],
  ["/guest/profile", "Profile Settings"],
  ["/guest/profile/connections", "Connections"],
  ["/guest/notifications", "Notifications"],
] as const;

test("guest can render every traveler dashboard screen", async ({ page }) => {
  await signInAsGuest(page);

  for (const [path, heading] of guestScreens) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("guest cannot access host ERP", async ({ page }) => {
  await signInAsGuest(page);
  await page.goto("/host/erp", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/become-a-host\/upgrade$/);
  await expect(page.getByRole("heading", { name: "ERP Hospitality Management", exact: true })).toHaveCount(0);
});

test("guest can open booking details, messages, and wishlist", async ({ page }) => {
  await signInAsGuest(page);

  await page.goto("/guest/bookings/b4", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Booking Details", exact: true })).toBeVisible();
  await expect(page.getByText("pending").first()).toBeVisible();

  await page.goto("/guest/messages", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Demo Host", exact: true })).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.setItem("stayprimeph-wishlist-property-ids", JSON.stringify(["p5"]));
  });
  await page.goto("/guest/wishlist", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Demo Host Garden Suite")).toBeVisible();
});

test("logged-out wishlist click is saved after guest sign-in", async ({ page }) => {
  await page.goto("/search?location=Tagaytay", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.clear();
  });

  await page.getByRole("button", { name: "Add to wishlist" }).first().click();
  await expect(page).toHaveURL(/\/login\?(.+&)?role=guest(&|$)/);

  await page.getByPlaceholder("Email").fill("guest@stayprimeph.com");
  await page.getByPlaceholder("Password").fill("Guest123!");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/guest\/wishlist$/);
  await expect(page.getByText("Demo Host Garden Suite")).toBeVisible();
});

test("room booking calendar shows unavailable dates privately", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rooms/42b8ae68-c9df-45f6-80c4-93a31e935c66", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Check-in Jun 14, 2026" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout Jun 19, 2026" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jun 4, 2026 unavailable" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Jun 13, 2026 unavailable" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Jun 14, 2026 available" })).toBeEnabled();
  await expect(page.getByText("Personal Guest Name")).toHaveCount(0);
});
