import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PayNowButton } from "@/components/bookings/pay-now-button";
import type { Booking } from "@/lib/types";

vi.mock("@/app/guest/bookings/actions", () => ({
  submitManualPaymentDetails: vi.fn(async () => ({})),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("tesseract.js", () => ({
  recognize: vi.fn(() => new Promise(() => {})),
}));

const booking: Booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-08",
  checkOut: "2026-07-10",
  guests: 1,
  totalPrice: 36_000,
  status: "confirmed",
  paymentStatus: "pending",
  createdAt: "2026-06-24T00:00:00.000Z",
};

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:receipt-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PayNowButton receipt upload", () => {
  test("shows the uploaded receipt preview while scanning", async () => {
    const { container } = render(
      <PayNowButton
        booking={booking}
        propertyTitle="Luxury staycation house"
        propertyLocation="Sta Maria"
        payment={null}
        csrfToken="csrf-token"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /pay now/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/choose payment method/i), { target: { value: "gcash" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const receiptInput = container.querySelector<HTMLInputElement>('input[name="receiptImage"]');
    expect(receiptInput).not.toBeNull();

    const receiptFile = new File(["receipt"], "gcash-receipt.png", { type: "image/png" });
    fireEvent.change(receiptInput!, { target: { files: [receiptFile] } });

    expect(await screen.findByText("Scanning receipt screenshot...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText("Uploaded receipt preview")).toHaveAttribute("src", "blob:receipt-preview"));
  });
});
