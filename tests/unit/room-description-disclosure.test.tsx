import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { RoomDescriptionDisclosure } from "@/components/rooms/room-description-disclosure";

const description =
  "Amani City Gate is a fully furnished condo close to the airport, shopping, public transport, and everyday essentials.";

function renderDisclosure() {
  return render(
    <RoomDescriptionDisclosure
      description={description}
      propertyTypeLabel="Condo"
      locationLabel="Davao City, Philippines"
      bedroomsLabel="1 bedroom"
      bathsLabel="1 bath"
      maxGuests={3}
      amenities={["Wifi", "Kitchen", "Pool"]}
      rules={["No smoking"]}
    />,
  );
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("RoomDescriptionDisclosure", () => {
  test("opens an Airbnb-style about modal with full listing details", async () => {
    renderDisclosure();

    expect(screen.queryByRole("dialog", { name: "About this space" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show more" }));

    const dialog = screen.getByRole("dialog", { name: "About this space" });
    expect(within(dialog).getByText(description)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "The space" })).toBeInTheDocument();
    expect(within(dialog).getByText(/accommodates up to 3 guests/)).toBeInTheDocument();
    expect(within(dialog).getByText("Wifi")).toBeInTheDocument();
  });

  test("closes the modal from the close button and Escape key", async () => {
    renderDisclosure();

    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(screen.queryByRole("dialog", { name: "About this space" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");

    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "About this space" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
