import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Booking, BookingPackage, Property, User } from "@/lib/types";

vi.mock("@/components/host/hosting-shell", () => ({
  HostingShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/host/host-calendar", () => ({
  HostCalendar: vi.fn(() => null),
}));

vi.mock("@/app/host/calendar/actions", () => ({
  blockHostAvailability: vi.fn(),
  deleteHostRateAdjustment: vi.fn(),
  removeHostAvailabilityBlock: vi.fn(),
  saveBookingPackageRates: vi.fn(),
  saveMonthlyHostRate: vi.fn(),
  saveSelectedDateHostRate: vi.fn(),
  setHostRateAdjustmentActive: vi.fn(),
}));

vi.mock("@/lib/availability", () => ({
  getAvailabilityBlocks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/bookings", () => ({
  getBookings: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn(),
}));

vi.mock("@/lib/properties", () => ({
  getPropertiesForHost: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUsers: vi.fn(),
}));

import { HostCalendarScreen } from "@/app/host/calendar/page";
import { HostCalendar } from "@/components/host/host-calendar";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getCsrfToken } from "@/lib/csrf";
import { getPropertiesForHost } from "@/lib/properties";
import { getUsers } from "@/lib/users";

const host: User = {
  id: "host-1",
  name: "Host",
  email: "host@example.test",
  role: "host",
  avatar: "",
  phone: "",
  createdAt: "2026-06-01",
  emailVerifiedAt: "2026-06-01T00:00:00.000Z",
};

function property(overrides: Partial<Property>): Property {
  return {
    id: "listing-1",
    hostId: host.id,
    slug: "listing-1",
    title: "The Caya",
    description: "A stay",
    address: "Iyam",
    city: "Lucena",
    country: "Philippines",
    pricePerNight: 1000,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    propertyType: "house",
    status: "approved",
    rating: 0,
    amenities: [],
    rules: [],
    createdAt: "2026-06-01",
    images: [],
    ...overrides,
  };
}

const booking: Booking = {
  id: "booking-1",
  propertyId: "deleted-listing",
  guestId: "guest-1",
  hostId: host.id,
  checkIn: "2026-08-01",
  checkOut: "2026-08-02",
  guests: 2,
  totalPrice: 1000,
  status: "completed",
  paymentStatus: "paid",
  createdAt: "2026-06-01",
};

const bookingPackage: BookingPackage = {
  id: "overnight-whole-villa",
  name: "Overnight - Whole Villa",
  status: "active",
  displayOrder: 1,
  accessType: "Whole villa",
  unit: "night",
  weekdayRate: 15000,
  weekendRate: 18000,
  holidayRate: 18000,
  includedGuests: 16,
  maxGuests: 40,
  additionalGuestFee: 0,
  extensionHourlyFee: 0,
  checkInTime: "15:00",
  checkOutTime: "11:00",
  enabled: true,
};

describe("HostCalendarScreen", () => {
  it("passes only visible host listings and their calendar data to the calendar", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(host);
    vi.mocked(getPropertiesForHost).mockResolvedValue([
      property({ id: "visible-listing", title: "The Caya", bookingPackages: [bookingPackage] }),
    ]);
    vi.mocked(getBookings).mockResolvedValue([
      booking,
      { ...booking, id: "booking-2", propertyId: "visible-listing" },
    ]);
    vi.mocked(getAvailabilityBlocks).mockResolvedValue([
      { id: "block-1", propertyId: "deleted-listing", date: "2026-08-01", reason: "other", createdAt: "2026-06-01" },
      { id: "block-2", propertyId: "visible-listing", date: "2026-08-02", reason: "maintenance", createdAt: "2026-06-01" },
    ]);
    vi.mocked(getUsers).mockResolvedValue([{ ...host, id: "guest-1", role: "guest", name: "Guest" }]);
    vi.mocked(getCsrfToken).mockResolvedValue("csrf-token");

    render(await HostCalendarScreen({}));

    expect(getPropertiesForHost).toHaveBeenCalledWith(host.id);
    expect(vi.mocked(HostCalendar).mock.calls[0]?.[0].listings.map((listing) => listing.id)).toEqual(["visible-listing"]);
    expect(vi.mocked(HostCalendar).mock.calls[0]?.[0].listings[0]?.bookingPackages?.map((pkg) => pkg.name)).toEqual(["Overnight - Whole Villa"]);
    expect(vi.mocked(HostCalendar).mock.calls[0]?.[0].bookings.map((item) => item.id)).toEqual(["booking-2"]);
    expect(vi.mocked(HostCalendar).mock.calls[0]?.[0].availabilityBlocks.map((item) => item.id)).toEqual(["block-2"]);
  });
});
