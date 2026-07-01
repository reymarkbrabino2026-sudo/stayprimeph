import type { ComponentProps } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { HostCalendar } from "@/components/host/host-calendar";

type HostCalendarProps = ComponentProps<typeof HostCalendar>;
type CalendarListing = HostCalendarProps["listings"][number];

const bookingPackage = {
  id: "overnight-whole-villa",
  name: "Overnight - Whole Villa",
  status: "active" as const,
  displayOrder: 1,
  unit: "night" as const,
  weekdayRate: 12500,
  weekendRate: 15000,
  holidayRate: 15000,
  enabled: true,
};

const listing: CalendarListing = {
  id: "listing-1",
  title: "The Caya",
  city: "Lucena",
  country: "Philippines",
  pricePerNight: 12500,
  weekendPrice: 15000,
  holidayPrice: 15000,
  bookingPackages: [bookingPackage],
  status: "approved" as const,
};

const formState = { status: "idle" as const, message: "" };

afterEach(() => {
  cleanup();
});

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderCalendar(overrides: Partial<HostCalendarProps> = {}) {
  const props: HostCalendarProps = {
    listings: [listing],
    bookings: [],
    availabilityBlocks: [],
    blockAvailabilityAction: vi.fn(async () => formState),
    csrfToken: "csrf-token",
    removeAvailabilityBlockAction: vi.fn(async () => undefined),
    savePackageRatesAction: vi.fn(async () => formState),
    saveSelectedDateRateAction: vi.fn(async () => formState),
    setRateAdjustmentActiveAction: vi.fn(async () => undefined),
    deleteRateAdjustmentAction: vi.fn(async () => undefined),
    ...overrides,
  };

  return render(
    <HostCalendar {...props} />,
  );
}

describe("HostCalendar", () => {
  test("separates rates from promos", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await user.click(screen.getByRole("button", { name: "The Caya" }));

    expect(screen.getByRole("button", { name: "Rates" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Rates" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Save rates" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Promos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save promo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Promos" }));

    expect(screen.getByRole("button", { name: "Promos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Promos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save promo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save rates" })).not.toBeInTheDocument();
  });

  test("allows a selected-date promo to be undone", async () => {
    const user = userEvent.setup();
    const selectedDate = dateKey();
    const deleteRateAdjustmentAction = vi.fn<HostCalendarProps["deleteRateAdjustmentAction"]>(async () => undefined);
    const listingWithPromo: CalendarListing = {
      ...listing,
      rateAdjustments: [
        {
          id: "promo-1",
          type: "discount",
          name: "Mistaken discount",
          startDate: selectedDate,
          endDate: selectedDate,
          active: true,
          discountPercent: 10,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    renderCalendar({ listings: [listingWithPromo], deleteRateAdjustmentAction });

    expect(screen.getByText("Mistaken discount")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo rate or promo" }));

    await waitFor(() => expect(deleteRateAdjustmentAction).toHaveBeenCalledTimes(1));
    const formData = deleteRateAdjustmentAction.mock.calls[0][0] as FormData;
    expect(formData.get("propertyId")).toBe("listing-1");
    expect(formData.get("adjustmentId")).toBe("promo-1");
  });
});
