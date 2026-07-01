import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { RoomReservationCard } from "@/components/rooms/room-reservation-card";
import type { BookingPackage, Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useReservationStore } from "@/stores/reservation-store";

const bookingPackages: BookingPackage[] = [
  {
    id: "overnight-full-access",
    name: "Overnight Full Access",
    description: "Whole-villa overnight package.",
    status: "active",
    displayOrder: 1,
    accessType: "Full access",
    unit: "night",
    weekdayRate: 9500,
    weekendRate: 12500,
    holidayRate: 13000,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 10,
    maxGuests: 20,
    sleepingCapacity: 20,
    durationHours: 21,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    accessibleFloors: ["Ground Floor", "Second Floor", "Outdoor Areas"],
    accessibleRoomIds: [],
    includedAmenities: ["WiFi", "Kitchen"],
    excludedAmenities: [],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 0,
    blockedPackageIds: ["daytime-ground-outdoor"],
    enabled: true,
  },
  {
    id: "daytime-ground-outdoor",
    name: "Daytime Ground Floor & Outdoor",
    description: "Daytime access.",
    status: "active",
    displayOrder: 2,
    accessType: "Ground floor and outdoor area only",
    unit: "day",
    weekdayRate: 4500,
    weekendRate: 6500,
    holidayRate: 0,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 10,
    maxGuests: 15,
    sleepingCapacity: 0,
    durationHours: 12,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "10:00 AM",
    checkOutTime: "10:00 PM",
    accessibleFloors: ["Ground Floor", "Outdoor Areas"],
    accessibleRoomIds: [],
    includedAmenities: ["WiFi", "Kitchen"],
    excludedAmenities: ["Bedrooms"],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 0,
    blockedPackageIds: ["overnight-full-access"],
    enabled: true,
  },
];

const property: Property = {
  id: "property-1",
  hostId: "host-1",
  slug: "test-property",
  title: "Test Property",
  description: "A test property.",
  address: "1 Test Street",
  city: "Davao",
  country: "Philippines",
  bookingType: "both",
  pricePerNight: 5400,
  weekendPrice: 6500,
  bedrooms: 6,
  bathrooms: 4,
  maxGuests: 20,
  propertyType: "villa",
  privacyType: "entire",
  status: "approved",
  rating: 5,
  amenities: ["WiFi"],
  rules: [],
  createdAt: "2026-06-01",
  images: [],
  bookingPackages,
};

afterEach(() => {
  cleanup();
  useReservationStore.getState().reset();
});

describe("RoomReservationCard", () => {
  test("keeps duplicate reservation cards in sync when switching to package booking", async () => {
    render(
      <>
        <RoomReservationCard property={property} rating="New" />
        <RoomReservationCard property={property} rating="New" />
      </>,
    );

    expect(screen.queryByText("Overnight Full Access")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Book Package" })[0]);

    await waitFor(() => {
      expect(useReservationStore.getState().bookingMode).toBe("package");
      expect(useReservationStore.getState().packageId).toBe("overnight-full-access");
    });
    expect(screen.getAllByText("Overnight Full Access")).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: /Daytime Ground Floor & Outdoor/ })).toHaveLength(2);
  });

  test("truncates long package option names while keeping the price visible", async () => {
    render(
      <RoomReservationCard
        property={{
          ...property,
          bookingPackages: [
            {
              ...bookingPackages[0],
              id: "event-overnight",
              name: "Event With Overnight Package Whole Villa",
              weekdayRate: 17500,
              weekendRate: 17500,
            },
            bookingPackages[1],
          ],
        }}
        rating="New"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Book Package" }));

    await waitFor(() => {
      expect(useReservationStore.getState().packageId).toBe("event-overnight");
    });
    expect(screen.getByRole("option", { name: "Event With Overnight Packa.... - ₱21,000" })).toBeInTheDocument();
    expect(screen.getByText("Event With Overnight Package Whole Villa")).toBeInTheDocument();
  });

  test("applies the new-listing 20% promotion to the reservation total", () => {
    useReservationStore.setState({
      checkIn: "2099-07-07",
      checkOut: "2099-07-08",
      guests: 1,
      bookingMode: "stay",
      packageId: null,
    });

    render(
      <RoomReservationCard
        property={{
          ...property,
          bookingType: "stay",
          bookingPackages: undefined,
          discounts: { newListing: true, lastMinute: false, weekly: false, monthly: false },
          weekendPrice: property.pricePerNight,
        }}
        rating="New"
        pricingBookings={[]}
      />,
    );

    expect(screen.getAllByText(formatCurrency(5184), { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText("New listing promotion (20% off)")).toBeInTheDocument();
    expect(screen.getByText(`-${formatCurrency(1296)}`)).toBeInTheDocument();
  });

  test("shows selected package sleeping capacity in the reservation summary", () => {
    useReservationStore.setState({
      bookingMode: "package",
      packageId: bookingPackages[0].id,
    });

    render(<RoomReservationCard property={property} rating="New" />);

    expect(screen.getByText("Up to 20 guests / 6 bedrooms / Sleeps 20")).toBeInTheDocument();
    expect(screen.queryByText(/sleeping capacity/i)).not.toBeInTheDocument();
  });
});
