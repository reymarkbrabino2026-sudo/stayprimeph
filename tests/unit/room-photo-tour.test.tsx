import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RoomGalleryShowcase } from "@/components/rooms/room-gallery-showcase";
import { RoomPhotoTour } from "@/components/rooms/room-photo-tour";
import { buildRoomPhotoTourGroups } from "@/lib/room-photo-tour";
import type { PropertyImage, PropertyRoom } from "@/lib/types";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;
    return React.createElement("img", imageProps);
  },
}));

const listingImages: PropertyImage[] = [
  { id: "listing-1", propertyId: "property", imageUrl: "/uploads/listing-1.jpg", tone: "" },
  { id: "listing-2", propertyId: "property", imageUrl: "/uploads/listing-2.jpg", tone: "" },
  { id: "listing-3", propertyId: "property", imageUrl: "/uploads/listing-3.jpg", tone: "" },
  { id: "listing-4", propertyId: "property", imageUrl: "/uploads/listing-4.jpg", tone: "" },
  { id: "listing-5", propertyId: "property", imageUrl: "/uploads/listing-5.jpg", tone: "" },
  { id: "listing-6", propertyId: "property", imageUrl: "/uploads/listing-6.jpg", tone: "" },
  { id: "duplicate", propertyId: "property", imageUrl: "/uploads/listing-6.jpg", tone: "" },
  { id: "pending", propertyId: "property", imageUrl: "pending-upload", tone: "" },
];

const rooms: PropertyRoom[] = [
  {
    id: "sanctuary",
    name: "Sanctuary Suite",
    capacity: 2,
    floor: "Second Floor",
    description: "Private suite for overnight guests.",
    photos: ["/uploads/rooms/sanctuary.jpg", "/uploads/rooms/sanctuary-2.jpg", "/uploads/rooms/sanctuary.jpg"],
    amenities: ["Smart TV", "Air conditioning"],
    active: true,
  },
  {
    id: "inactive-room",
    name: "Inactive Room",
    capacity: 4,
    floor: "Ground Floor",
    photos: ["/uploads/rooms/inactive.jpg"],
    amenities: [],
    active: false,
  },
];

beforeEach(() => {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  document.documentElement.classList.remove("lenis-stopped");
});

describe("room photo tour", () => {
  test("builds featured, room, and additional photo groups from listing data", () => {
    const groups = buildRoomPhotoTourGroups({
      propertyTitle: "Prime Stay",
      propertyTypeLabel: "Condo",
      listingImages,
      rooms,
    });

    expect(groups.map((group) => group.title)).toEqual([
      "Featured photos",
      "Sanctuary Suite",
      "Additional photos",
    ]);
    expect(groups[0].photos).toHaveLength(5);
    expect(groups[1].summary).toBe("Second Floor - 2 guests - 2 photos");
    expect(groups[1].photos.map((photo) => photo.imageUrl)).toEqual([
      "/uploads/rooms/sanctuary.jpg",
      "/uploads/rooms/sanctuary-2.jpg",
    ]);
    expect(groups[2].photos.map((photo) => photo.imageUrl)).toEqual(["/uploads/listing-6.jpg"]);
  });

  test("uses a single all photos group for short listings without room photos", () => {
    const groups = buildRoomPhotoTourGroups({
      propertyTitle: "Compact Stay",
      propertyTypeLabel: "Studio",
      listingImages: listingImages.slice(0, 3),
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("All photos");
    expect(groups[0].summary).toBe("Studio overview - 3 photos");
  });

  test("groups detected listing photos by room category", () => {
    const groups = buildRoomPhotoTourGroups({
      propertyTitle: "Prime Stay",
      propertyTypeLabel: "Villa",
      listingImages: [
        { id: "kitchen-1", propertyId: "property", imageUrl: "/uploads/kitchen.jpg", tone: "", category: "kitchen" },
        { id: "bedroom-1", propertyId: "property", imageUrl: "/uploads/bedroom.jpg", tone: "", category: "bedroom" },
        { id: "kitchen-2", propertyId: "property", imageUrl: "/uploads/kitchen-2.jpg", tone: "", category: "kitchen" },
      ],
    });

    expect(groups.map((group) => group.title)).toEqual(["Kitchen", "Bedroom"]);
    expect(groups[0].photos.map((photo) => photo.imageUrl)).toEqual([
      "/uploads/kitchen.jpg",
      "/uploads/kitchen-2.jpg",
    ]);
    expect(groups[1].summary).toBe("1 photo");
  });

  test("renders thumbnail navigation and grouped photo sections", () => {
    const groups = buildRoomPhotoTourGroups({
      propertyTitle: "Prime Stay",
      propertyTypeLabel: "Condo",
      listingImages,
      rooms,
    });

    render(<RoomPhotoTour groups={groups} />);

    expect(screen.getByRole("navigation", { name: "Photo tour sections" })).toBeInTheDocument();
    expect(screen.getAllByText("Featured photos")).toHaveLength(2);
    expect(screen.getAllByText("Sanctuary Suite")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /sanctuary suite/i })).toHaveAttribute("href", "#photo-tour-sanctuary");
    expect(screen.getByRole("heading", { name: "Sanctuary Suite" }).parentElement).toHaveClass("lg:sticky");
    expect(screen.getByAltText("Prime Stay Sanctuary Suite photo 1")).toBeInTheDocument();
  });

  test("opens the all-photo tour from the slider image and button", async () => {
    const user = userEvent.setup();
    const groups = buildRoomPhotoTourGroups({
      propertyTitle: "Prime Stay",
      propertyTypeLabel: "Condo",
      listingImages: listingImages.slice(0, 1),
    });

    window.history.replaceState(null, "", "/rooms/property");
    render(
      <RoomGalleryShowcase
        images={listingImages.slice(0, 1)}
        title="Prime Stay"
        groups={groups}
        propertyId="property"
        isAuthenticated
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show all photos" }));

    const dialog = screen.getByRole("dialog", { name: "Photo tour" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("data-lenis-prevent");
    expect(dialog).toHaveClass("z-[1000]");
    expect(screen.getByRole("button", { name: "Back to listing" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Photo tour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(document.body.style.position).toBe("fixed");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.documentElement).toHaveClass("lenis-stopped");
    expect(new URL(window.location.href).searchParams.get("modal")).toBe("PHOTO_TOUR_SCROLLABLE");

    await user.click(screen.getByRole("button", { name: "Back to listing" }));
    expect(screen.queryByRole("dialog", { name: "Photo tour" })).not.toBeInTheDocument();
    expect(document.body.style.position).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(new URL(window.location.href).searchParams.get("modal")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show all photos for Prime Stay" }));
    expect(screen.getByRole("dialog", { name: "Photo tour" })).toBeInTheDocument();
  });

  test("opens the all-photo tour when the modal URL is loaded directly", async () => {
    const groups = buildRoomPhotoTourGroups({
      propertyTitle: "Prime Stay",
      propertyTypeLabel: "Condo",
      listingImages: listingImages.slice(0, 1),
    });

    window.history.replaceState(null, "", "/rooms/property?modal=PHOTO_TOUR_SCROLLABLE");
    render(
      <RoomGalleryShowcase
        images={listingImages.slice(0, 1)}
        title="Prime Stay"
        groups={groups}
        propertyId="property"
        isAuthenticated
      />,
    );

    expect(await screen.findByRole("dialog", { name: "Photo tour" })).toBeInTheDocument();
  });
});
