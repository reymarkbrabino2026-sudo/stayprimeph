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
    accessibleRoomIds: ["ground-floor-room", "second-floor-room"],
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
    accessibleRoomIds: ["ground-floor-room"],
    includedAmenities: ["WiFi", "Kitchen"],
    excludedAmenities: ["Bedrooms"],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 0,
    blockedPackageIds: ["overnight-full-access"],
    enabled: true,
  },
  {
    id: "daytime-no-bedrooms",
    name: "Daytime No Bedroom Access",
    description: "Daytime event access without bedrooms.",
    status: "active",
    displayOrder: 3,
    accessType: "Custom access",
    unit: "day",
    weekdayRate: 4000,
    weekendRate: 0,
    holidayRate: 0,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 10,
    maxGuests: 20,
    sleepingCapacity: 0,
    durationHours: 9,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "12:00 PM",
    checkOutTime: "9:00 PM",
    accessibleFloors: ["Ground Floor"],
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
  rooms: [
    { id: "ground-floor-room", name: "Oasis Room", capacity: 4, floor: "Ground Floor", photos: [], amenities: [], active: true },
    { id: "second-floor-room", name: "Nest Room", capacity: 4, floor: "Second Floor", photos: [], amenities: [], active: true },
  ],
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
    expect(screen.getAllByText("Overnight Full Access", { selector: "p" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: /Daytime Ground Floor & Outdoor/ })).toHaveLength(2);
  });

  test("shows package option names without prices", async () => {
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
    expect(screen.getByRole("option", { name: "Event With Overnight Package Whole Villa" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /21,000/ })).not.toBeInTheDocument();
    expect(screen.getByText("Event With Overnight Package Whole Villa", { selector: "p" })).toBeInTheDocument();
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

    expect(screen.getByText("Up to 20 guests")).toBeInTheDocument();
    expect(screen.getByText("2 bedrooms")).toBeInTheDocument();
    expect(screen.getByText("Sleeps 20")).toBeInTheDocument();
    expect(screen.queryByText("6 bedrooms")).not.toBeInTheDocument();
    expect(screen.queryByText(/sleeping capacity/i)).not.toBeInTheDocument();
  });

  test("uses selected package rooms for the bedroom summary", () => {
    useReservationStore.setState({
      bookingMode: "package",
      packageId: bookingPackages[1].id,
    });

    render(<RoomReservationCard property={property} rating="New" />);

    expect(screen.getByText("Up to 15 guests")).toBeInTheDocument();
    expect(screen.getByText("1 bedroom")).toBeInTheDocument();
    expect(screen.queryByText("6 bedrooms")).not.toBeInTheDocument();
  });

  test("does not fall back to listing bedrooms when package rooms are none", () => {
    useReservationStore.setState({
      bookingMode: "package",
      packageId: bookingPackages[2].id,
    });

    render(<RoomReservationCard property={property} rating="New" />);

    expect(screen.getByText("Up to 20 guests")).toBeInTheDocument();
    expect(screen.getByText("No bedroom access")).toBeInTheDocument();
    expect(screen.queryByText("6 bedrooms")).not.toBeInTheDocument();
  });

  test("disables package check-in dates outside the package operating days", async () => {
    useReservationStore.setState({
      checkIn: "2099-07-05",
      checkOut: "2099-07-06",
      bookingMode: "package",
      packageId: bookingPackages[0].id,
    });

    render(
      <RoomReservationCard
        property={{
          ...property,
          bookingType: "package",
          bookingPackages: [{ ...bookingPackages[0], availableDays: [1] }],
        }}
        rating="New"
      />,
    );

    const closedSunday = screen.getByRole("button", { name: /Jul 5, 2099 Closed, unavailable/i });
    expect(closedSunday).toBeDisabled();
    expect(screen.getByRole("button", { name: /Jul 6, 2099 Check-in, available/i })).toBeInTheDocument();
  });
});
