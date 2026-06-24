import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PayoutSettings } from "@/components/account/payout-settings";
import { defaultFinancialSettings } from "@/lib/account-settings-types";

vi.mock("@/app/account-settings/actions", () => ({
  saveFinancialSettingsAction: vi.fn(),
  verifyFinancialSettingsStepUpAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("PayoutSettings", () => {
  test("renders payout history from real payout records", () => {
    render(
      <PayoutSettings
        initialFinancial={defaultFinancialSettings}
        payouts={[
          {
            id: "payout-live-1",
            hostId: "host-1",
            bookingId: "booking-live-1",
            paymentId: "payment-live-1",
            amount: 10000,
            status: "paid",
            availableOn: "2026-06-24T09:00:00.000Z",
            createdAt: "2026-06-24T10:00:00.000Z",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /go to your transaction history/i }));

    expect(screen.getAllByText("₱10,000")).toHaveLength(2);
    expect(screen.getByText("Booking transaction booking-live-1")).toBeInTheDocument();
    expect(screen.getByText(/payout-live-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/May hosting payout/i)).not.toBeInTheDocument();
  });
});
