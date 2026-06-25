import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { RoomAccessPreview } from "@/components/rooms/room-access-preview";
import type { PropertyRoom } from "@/lib/types";

const rooms: PropertyRoom[] = [
  {
    id: "sanctuary",
    name: "Sanctuary Suite",
    capacity: 2,
    floor: "Second Floor",
    description: "Private suite for overnight guests.",
    photos: ["/uploads/rooms/sanctuary.jpg"],
    amenities: ["Smart TV", "Air conditioning"],
    active: true,
  },
  {
    id: "serene",
    name: "Serene Room",
    capacity: 4,
    floor: "Second Floor",
    description: "Shared bedroom for families or groups.",
    photos: ["/uploads/rooms/serene.jpg"],
    amenities: ["Air conditioning"],
    active: true,
  },
];

afterEach(() => {
  cleanup();
});

describe("RoomAccessPreview", () => {
  test("uses the hovered room photo as the preview background", () => {
    const { container } = render(
      <RoomAccessPreview
        rooms={rooms}
        bookingPackages={[]}
        listingImages={[]}
        stayBookingAllowed
        packageBookingAllowed={false}
      />,
    );

    expect(container.querySelector('[style*="/uploads/rooms/sanctuary.jpg"]')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("button", { name: /serene room/i }));

    expect(container.querySelector('[style*="/uploads/rooms/serene.jpg"]')).toBeInTheDocument();
  });
});
