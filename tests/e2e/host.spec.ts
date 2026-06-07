import { expect, test } from "@playwright/test";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

async function cleanupHostByEmail(email: string) {
  const usersPath = path.join(dataDir, "users.json");
  const tokensPath = path.join(dataDir, "auth-tokens.json");
  const users = JSON.parse(await readFile(usersPath, "utf8")) as Array<{ id: string; email: string }>;
  const user = users.find((item) => item.email === email);
  if (!user) return;

  await writeFile(usersPath, `${JSON.stringify(users.filter((item) => item.id !== user.id), null, 2)}\n`);

  const tokens = JSON.parse(await readFile(tokensPath, "utf8")) as Array<{ userId: string }>;
  await writeFile(tokensPath, `${JSON.stringify(tokens.filter((item) => item.userId !== user.id), null, 2)}\n`);
}

async function signInAsHost(page: import("@playwright/test").Page) {
  await page.goto("/login?role=host", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill("host@stayprimeph.com");
  await page.getByPlaceholder("Password").fill("Host123!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/host\/dashboard$/, { timeout: 30000 });
}

const hostScreens = [
  ["/host/dashboard", "Host Overview"],
  ["/host/listings", "My Listings"],
  ["/host/bookings", "Booking Requests"],
  ["/host/earnings", "Earnings"],
  ["/host/messages", "Messages"],
  ["/host/reviews", "Reviews"],
  ["/host/profile", "Host Profile"],
] as const;

test("host can render every dashboard screen", async ({ page }) => {
  await signInAsHost(page);

  for (const [path, heading] of hostScreens) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("host can open listing details and booking requests", async ({ page }) => {
  await signInAsHost(page);

  await page.goto("/host/listings/p5", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Listing Details", exact: true })).toBeVisible();
  await expect(page.getByText("Demo Host Garden Suite")).toBeVisible();

  await page.goto("/host/bookings", { waitUntil: "domcontentloaded" });
  await expect(page.locator("tbody").getByText("Waiting for guest payment")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject booking" }).first()).toBeVisible();
});

test("host can open calendar and create-listing flow", async ({ page }) => {
  await signInAsHost(page);

  await page.goto("/host/calendar", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Price settings")).toBeVisible();
  await expect(page.getByText("Availability settings")).toBeVisible();

  await page.goto("/host/listings/create", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/become-a-host\/setup(?:\?new=1)?$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Set up your StayPrimePH listing" })).toBeVisible();
});

test("host calendar fits mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsHost(page);

  await page.goto("/host/calendar", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "All listings" })).toBeVisible();

  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
});

test("host calendar header controls respond", async ({ page }) => {
  await signInAsHost(page);

  await page.goto("/host/calendar", { waitUntil: "domcontentloaded" });

  const monthPicker = page.getByRole("button", { name: "Choose calendar month" });
  await expect(monthPicker).toBeVisible();
  await monthPicker.click();
  await expect(page.getByRole("menuitem", { name: "July 2026" })).toBeVisible();
  await page.getByRole("menuitem", { name: "July 2026" }).click();
  await expect(page.getByRole("heading", { name: "July 2026" })).toBeVisible();

  const viewOptions = page.getByRole("button", { name: "Calendar view options" });
  await expect(viewOptions).toBeVisible();
  await viewOptions.click();
  await expect(page.getByRole("menuitem", { name: "Next month" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Current month" }).click();
  await expect(page.getByRole("button", { name: "Choose calendar month" })).toContainText("June 2026");
});

test("listing draft is isolated between host accounts after logout", async ({ page }) => {
  test.setTimeout(180000);

  const leakedValue = "jamespandian2025@gmail.com";
  const secondHostEmail = `host-${Date.now()}@example.com`;

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.localStorage.removeItem("stayprimeph-host-wizard");
      window.sessionStorage.clear();
    });

    await signInAsHost(page);
    await page.goto("/become-a-host/setup", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Street address").fill(leakedValue);
    await page.getByRole("button", { name: "Save & exit" }).click();
    await expect(page).toHaveURL(/\/host\/listings$/, { timeout: 30000 });

    await page.goto("/host/profile", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 30000 });

    await page.goto("/register?role=host", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("First name").fill("Second");
    await page.getByPlaceholder("Last name").fill("Host");
    await page.getByLabel("Date of birth").fill("1990-01-01");
    await page.getByPlaceholder("Email").fill(secondHostEmail);
    await page.getByPlaceholder("Create a password").fill("Host123!");
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await expect(page.getByRole("heading", { name: "Everyone belongs here" })).toBeVisible();
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await expect(page).toHaveURL(/\/host\/dashboard$/, { timeout: 30000 });

    await page.goto("/become-a-host/setup", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/become-a-host\/setup$/, { timeout: 30000 });
    await expect(page.getByLabel("Street address")).not.toHaveValue(leakedValue);
    await expect(page.getByText(leakedValue)).toHaveCount(0);

    const session = await page.request.get("/api/session");
    await expect(session).toBeOK();
    const data = (await session.json()) as { user: { email: string } | null };
    expect(data.user?.email).toBe(secondHostEmail);
  } finally {
    await cleanupHostByEmail(secondHostEmail);
  }
});
