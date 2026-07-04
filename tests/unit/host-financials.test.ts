import { describe, expect, it } from "vitest";

import { getHostFinancialMonthSummary, paidNightsInMonth } from "@/lib/host-financials";
import type { Booking, HostExpense, HostMonthlyReport } from "@/lib/types";
import type { PaidAvailabilityBlock } from "@/lib/paid-availability-blocks";

function paidBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    propertyId: "property-1",
    guestId: "guest-1",
    hostId: "host-1",
    checkIn: "2026-07-02",
    checkOut: "2026-07-04",
    guests: 4,
    totalPrice: 18000,
    status: "confirmed",
    paymentStatus: "paid",
    createdAt: "2026-07-01",
    ...overrides,
  };
}

function report(overrides: Partial<HostMonthlyReport> = {}): HostMonthlyReport {
  return {
    id: "report-1",
    hostId: "host-1",
    month: "2026-07",
    salesAmount: 2000,
    expensesAmount: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function expense(overrides: Partial<HostExpense> = {}): HostExpense {
  return {
    id: "expense-1",
    hostId: "host-1",
    expenseDate: "2026-07-03",
    month: "2026-07",
    category: "Cleaning Materials",
    amount: 100,
    quantity: 2,
    unit: "PC",
    vendor: "Supplier",
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

function paidBlock(overrides: Partial<PaidAvailabilityBlock> = {}): PaidAvailabilityBlock {
  return {
    id: "block-1",
    propertyId: "property-1",
    hostId: "host-1",
    propertyTitle: "The Caya",
    date: "2026-07-05",
    checkIn: "2026-07-05",
    checkOut: "2026-07-06",
    reason: "booked_elsewhere",
    reasonLabel: "Booked on another platform",
    totalPrice: 40500,
    ...overrides,
  };
}

describe("host financial month summary", () => {
  it("uses the same booking payout, external paid block, sale, and expense totals for ERP and reports", () => {
    const summary = getHostFinancialMonthSummary({
      bookings: [paidBooking(), paidBooking({ id: "pending", paymentStatus: "pending" })],
      expenses: [expense(), expense({ id: "other-month", expenseDate: "2026-08-01", month: "2026-08", amount: 999 })],
      month: "2026-07",
      paidBlocks: [paidBlock(), paidBlock({ id: "other-block", date: "2026-08-01", totalPrice: 999 })],
      reports: [report(), report({ id: "other-report", month: "2026-08", salesAmount: 999 })],
    });

    expect(summary.bookingOnlyPayout).toBe(15000);
    expect(summary.externalPaidTotal).toBe(40500);
    expect(summary.bookingPayout).toBe(55500);
    expect(summary.manualSales).toBe(2000);
    expect(summary.expenseTotal).toBe(200);
    expect(summary.income).toBe(57500);
    expect(summary.netIncome).toBe(57300);
    expect(summary.bookedNights).toBe(3);
  });

  it("uses expense dates, not stale stored months, when grouping expenses", () => {
    const summary = getHostFinancialMonthSummary({
      bookings: [],
      expenses: [expense({ expenseDate: "2026-06-30", month: "2026-07", amount: 300 })],
      month: "2026-06",
      paidBlocks: [],
      reports: [],
    });

    expect(summary.monthExpenses).toHaveLength(1);
    expect(summary.expenseTotal).toBe(600);
  });

  it("counts only the paid booking nights that overlap the selected month", () => {
    expect(paidNightsInMonth(paidBooking({ checkIn: "2026-06-29", checkOut: "2026-07-02" }), "2026-07")).toBe(1);
    expect(paidNightsInMonth(paidBooking({ checkIn: "2026-07-30", checkOut: "2026-08-02" }), "2026-07")).toBe(2);
  });
});
