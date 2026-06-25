import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { RoomAccessPreview } from "@/components/rooms/room-access-preview";
import type { PropertyImage, PropertyRoom } from "@/lib/types";

const rooms: PropertyRoom[] = [
  {
    id: "sanctuary",
    name: "Sanctuary Suite",
    capacity: 2,
    floor: "Second Floor",
    description: "Private suite for overnight guests.",
    photos: ["/uploads/rooms/sanctuary.jpg", "/uploads/rooms/sanctuary-2.jpg"],
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
  test("uses clicked room photo as the preview background", () => {
    const { container } = render(
      <RoomAccessPreview
        rooms={rooms}
        listingImages={[]}
        stayBookingAllowed
      />,
    );

    expect(container.querySelector('[style*="/uploads/rooms/sanctuary.jpg"]')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("button", { name: /serene room/i }));

    expect(container.querySelector('[style*="/uploads/rooms/sanctuary.jpg"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /serene room/i }));

    expect(container.querySelector('[style*="/uploads/rooms/serene.jpg"]')).toBeInTheDocument();
  });

  test("keeps the right side as an image-only carousel", () => {
    const { container } = render(
      <RoomAccessPreview
        rooms={rooms}
        listingImages={[]}
        stayBookingAllowed
      />,
    );

    expect(screen.queryByRole("heading", { name: "Stay booking" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Sanctuary Suite")).toHaveLength(1);
    expect(screen.queryByText("Included amenities")).not.toBeInTheDocument();
    expect(screen.queryByText("Duration")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next room image/i }));

    expect(container.querySelector('[style*="/uploads/rooms/sanctuary-2.jpg"]')).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  test("does not build carousel controls from listing fallback photos", () => {
    const fallbackListingImages: PropertyImage[] = [
      { id: "listing-1", propertyId: "property", imageUrl: "/uploads/listing-1.jpg", tone: "from-white to-white" },
      { id: "listing-2", propertyId: "property", imageUrl: "/uploads/listing-2.jpg", tone: "from-white to-white" },
    ];

    const { container } = render(
      <RoomAccessPreview
        rooms={[{ ...rooms[0], photos: [] }]}
        listingImages={fallbackListingImages}
        stayBookingAllowed
      />,
    );

    expect(container.querySelector('[style*="/uploads/listing-1.jpg"]')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next room image/i })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 2")).not.toBeInTheDocument();
  });
});
