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
});
