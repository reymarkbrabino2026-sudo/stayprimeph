import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DeleteListingButton } from "@/components/forms/delete-listing-button";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

const deleteListingMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/app/host/listings/actions", () => ({
  deleteListing: deleteListingMock,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeleteListingButton", () => {
  test("shows a protected-booking error returned by the delete action", async () => {
    const message = "This listing has active bookings and cannot be deleted. Please resolve those bookings before deleting the listing.";
    deleteListingMock.mockResolvedValueOnce({ status: "error", error: message });

    render(<DeleteListingButton listingId="listing-1" csrfToken="csrf-token" />);

    fireEvent.click(screen.getByRole("button", { name: /^delete listing$/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
