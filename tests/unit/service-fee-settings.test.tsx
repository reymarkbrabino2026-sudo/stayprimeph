import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ServiceFeeSettings } from "@/components/account/service-fee-settings";
import { formatCurrency } from "@/lib/utils";

afterEach(() => {
  cleanup();
});

describe("ServiceFeeSettings", () => {
  test("shows the fixed 20% StayPrimePH markup rule", () => {
    render(<ServiceFeeSettings />);

    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText(/guests pay the host amount plus a 20% StayPrimePH markup/i)).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(30000))).toHaveLength(2);
    expect(screen.getByText(formatCurrency(6000))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(36000))).toBeInTheDocument();
  });
});
