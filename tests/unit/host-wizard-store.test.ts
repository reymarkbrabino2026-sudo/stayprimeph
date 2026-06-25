import { beforeEach, describe, expect, it } from "vitest";
import type { HostPropertyRoomDraft } from "@/lib/host-wizard-types";
import { useHostWizardStore } from "@/stores/host-wizard-store";

function room(overrides: Partial<HostPropertyRoomDraft> = {}): HostPropertyRoomDraft {
  return {
    id: "room-1",
    name: "Nest Room",
    capacity: 2,
    floor: "Second Floor",
    description: "",
    photos: [],
    amenities: [],
    active: true,
    ...overrides,
  };
}

describe("host wizard store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useHostWizardStore.setState({
      ownerUserId: "host-1",
      ownerEmail: "host@example.com",
      initialized: true,
      currentStep: "rooms",
    });
    useHostWizardStore.getState().resetDraft();
    useHostWizardStore.setState({
      ownerUserId: "host-1",
      ownerEmail: "host@example.com",
      initialized: true,
      currentStep: "rooms",
      draft: {
        ...useHostWizardStore.getState().draft,
        privacyType: "entire",
        rooms: [room()],
      },
    });
  });

  it("applies async room photo updates to the latest rooms draft", () => {
    const completeUpload = () => useHostWizardStore.getState().updateDraft((currentDraft) => ({
      rooms: currentDraft.rooms.map((item) => (
        item.id === "room-1"
          ? { ...item, photos: [...item.photos, "https://assets.example/room-photo.jpg"] }
          : item
      )),
    }));

    useHostWizardStore.getState().updateDraft((currentDraft) => ({
      rooms: [
        ...currentDraft.rooms,
        room({ id: "room-2", name: "Serene Room", floor: "Ground Floor" }),
      ],
    }));
    completeUpload();

    const rooms = useHostWizardStore.getState().draft.rooms;
    expect(rooms.map((item) => item.id)).toEqual(["room-1", "room-2"]);
    expect(rooms.find((item) => item.id === "room-1")?.photos).toEqual([
      "https://assets.example/room-photo.jpg",
    ]);
  });

  it("keeps overnight access checked for all active rooms and selected amenities", () => {
    useHostWizardStore.getState().updateDraft((currentDraft) => ({
      amenityIds: ["wifi", "tv", "workspace", "Custom arcade"],
      rooms: [
        room({ id: "room-1", name: "Nest Room", floor: "Second Floor" }),
        room({ id: "room-2", name: "Oasis Room", floor: "Ground Floor" }),
        room({ id: "room-3", name: "Maintenance Room", floor: "Ground Floor", active: false }),
      ],
      bookingPackages: currentDraft.bookingPackages.map((pkg) => (
        pkg.id === "overnight-full-access"
          ? {
              ...pkg,
              accessibleFloors: ["Ground Floor"],
              accessibleRoomIds: [],
              includedAmenities: ["WiFi"],
              excludedAmenities: ["Bedrooms", "Second floor access"],
            }
          : pkg
      )),
    }));

    const overnightPackage = useHostWizardStore.getState().draft.bookingPackages.find((pkg) => pkg.id === "overnight-full-access");

    expect(overnightPackage?.accessibleFloors).toEqual(["Second Floor", "Ground Floor", "Outdoor Areas"]);
    expect(overnightPackage?.accessibleRoomIds).toEqual(["room-1", "room-2"]);
    expect(overnightPackage?.includedAmenities).toEqual(expect.arrayContaining(["WiFi", "TV", "Workspace", "Custom arcade"]));
    expect(overnightPackage?.excludedAmenities).toEqual([]);
  });
});
