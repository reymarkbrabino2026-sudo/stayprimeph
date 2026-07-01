import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { BookingPackageEditor } from "@/components/forms/booking-package-editor";
import type { BookingPackage, Property } from "@/lib/types";

const bookingPackage = {
  id: "property-1-daytime",
  name: "Daytime Event Package",
  description: "",
  status: "active",
  displayOrder: 1,
  accessType: "Ground floor access",
  unit: "day",
  weekdayRate: 6000,
  weekendRate: 8000,
  holidayRate: 0,
  holidayDates: [],
  seasonalRates: [],
  includedGuests: 20,
  maxGuests: 30,
  sleepingCapacity: 0,
  durationHours: 9,
  additionalGuestFee: 0,
  extensionHourlyFee: 0,
  checkInTime: "10:00 AM",
  checkOutTime: "7:00 PM",
  accessibleFloors: ["Ground Floor"],
  accessibleRoomIds: ["property-1-room-1"],
  includedAmenities: ["Kitchen", "Karaoke"],
  excludedAmenities: [],
  availableDays: [0, 1, 2, 3, 4, 5, 6],
  minimumAdvanceBookingDays: 0,
  blockedPackageIds: [],
  enabled: true,
} satisfies BookingPackage;

const property = {
  id: "property-1",
  hostId: "host-1",
  slug: "test-listing",
  title: "Test Listing",
  description: "A listing",
  address: "123 Test",
  city: "Tagaytay",
  country: "Philippines",
  bookingType: "both",
  pricePerNight: 9000,
  weekendPrice: 11000,
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 20,
  propertyType: "Villa",
  privacyType: "entire",
  status: "approved",
  rating: 0,
  amenities: ["Kitchen", "WiFi", "Pool"],
  rules: [],
  createdAt: "2026-06-01",
  images: [],
  rooms: [
    { id: "property-1-room-1", name: "Nest Room", capacity: 2, floor: "Second Floor", photos: [], amenities: [], active: true },
    { id: "property-1-room-2", name: "Oasis Room", capacity: 4, floor: "Ground Floor", photos: [], amenities: [], active: true },
    { id: "property-1-room-3", name: "Storage Room", capacity: 1, floor: "Ground Floor", photos: [], amenities: [], active: false },
  ],
  bookingPackages: [bookingPackage],
} satisfies Property;

afterEach(() => {
  cleanup();
});

function accessibleRoomsInput(container: HTMLElement) {
  return container.querySelector('input[name="bookingPackageAccessibleRoomIds"]') as HTMLInputElement;
}

function includedAmenitiesInput(container: HTMLElement) {
  return container.querySelector('input[name="bookingPackageIncludedAmenities"]') as HTMLInputElement;
}

describe("BookingPackageEditor", () => {
  test("allows decimal package rates", () => {
    render(
      <>
        <form id="listing-form" />
        <BookingPackageEditor property={property} formId="listing-form" />
      </>,
    );

    const weekdayRate = screen.getByLabelText("Weekday rate") as HTMLInputElement;
    const weekendRate = screen.getByLabelText("Weekend rate") as HTMLInputElement;

    expect(weekdayRate.step).toBe("0.01");
    expect(weekendRate.step).toBe("0.01");

    fireEvent.change(weekdayRate, { target: { value: "6666.67" } });
    expect(weekdayRate.value).toBe("6666.67");
  });

  test("updates package room access through the rooms dropdown", () => {
    const { container } = render(
      <>
        <form id="listing-form" />
        <BookingPackageEditor property={property} formId="listing-form" />
      </>,
    );

    expect(accessibleRoomsInput(container).value).toBe(JSON.stringify(["property-1-room-1"]));
    expect(screen.getAllByText("Nest Room").length).toBeGreaterThan(0);
    expect(screen.queryByText("Storage Room")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Oasis Room/i }));
    expect(accessibleRoomsInput(container).value).toBe(JSON.stringify(["property-1-room-1", "property-1-room-2"]));

    fireEvent.click(screen.getByRole("checkbox", { name: "None" }));
    expect(accessibleRoomsInput(container).value).toBe("[]");
  });

  test("updates included amenities through amenity checkboxes", () => {
    const { container } = render(
      <>
        <form id="listing-form" />
        <BookingPackageEditor property={property} formId="listing-form" />
      </>,
    );

    const includedAmenities = includedAmenitiesInput(container);
    expect(includedAmenities.value).toBe("Kitchen, Karaoke");
    expect(screen.queryByLabelText("Included amenities")).not.toBeInTheDocument();

    expect(screen.getByRole("checkbox", { name: "Kitchen" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Karaoke" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "WiFi" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "WiFi" }));
    expect(includedAmenities.value).toBe("Kitchen, Karaoke, WiFi");
    expect(screen.getByRole("checkbox", { name: "WiFi" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Kitchen" }));
    expect(includedAmenities.value).toBe("Karaoke, WiFi");
    expect(screen.getByRole("checkbox", { name: "Kitchen" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Karaoke" }));
    expect(includedAmenities.value).toBe("WiFi");
    expect(screen.queryByRole("checkbox", { name: "Karaoke" })).not.toBeInTheDocument();
  });
});
