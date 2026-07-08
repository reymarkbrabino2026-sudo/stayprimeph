import { describe, expect, it } from "vitest";

import { getHostFinancialMonthSummary, getHostFinancialYearSummary, paidNightsInMonth } from "@/lib/host-financials";
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

describe("host financial year summary", () => {
  it("sums paid bookings and external blocks across the whole year", () => {
    const summary = getHostFinancialYearSummary({
      bookings: [
        paidBooking({ id: "jan", checkIn: "2026-01-10", checkOut: "2026-01-12", totalPrice: 18000 }),
        paidBooking({ id: "jul", checkIn: "2026-07-02", checkOut: "2026-07-04", totalPrice: 18000 }),
      ],
      expenses: [],
      paidBlocks: [paidBlock({ date: "2026-03-05", totalPrice: 40500 })],
      reports: [],
      year: "2026",
    });

    expect(summary.bookingOnlyPayout).toBe(30000);
    expect(summary.externalPaidTotal).toBe(40500);
    expect(summary.bookingPayout).toBe(70500);
  });

  it("counts a booking that spans two months only once", () => {
    const summary = getHostFinancialYearSummary({
      bookings: [paidBooking({ id: "spanning", checkIn: "2026-06-29", checkOut: "2026-07-03", totalPrice: 18000 })],
      expenses: [],
      paidBlocks: [],
      reports: [],
      year: "2026",
    });

    expect(summary.paidBookings).toHaveLength(1);
    expect(summary.bookingPayout).toBe(15000);
  });

  it("excludes unpaid bookings and revenue from other years", () => {
    const summary = getHostFinancialYearSummary({
      bookings: [
        paidBooking({ id: "unpaid", paymentStatus: "pending" }),
        paidBooking({ id: "last-year", checkIn: "2025-12-10", checkOut: "2025-12-12" }),
      ],
      expenses: [],
      paidBlocks: [paidBlock({ id: "last-year-block", date: "2025-11-01", totalPrice: 999 })],
      reports: [],
      year: "2026",
    });

    expect(summary.bookingPayout).toBe(0);
  });

  it("sums each month's net income, so a loss month lowers the yearly total", () => {
    const summary = getHostFinancialYearSummary({
      // July payout = 15000 (18000 gross), no June income.
      bookings: [paidBooking({ id: "jul", checkIn: "2026-07-02", checkOut: "2026-07-04", totalPrice: 18000 })],
      expenses: [
        expense({ id: "jun", expenseDate: "2026-06-10", month: "2026-06", amount: 20000, quantity: 1 }),
        expense({ id: "jul", expenseDate: "2026-07-10", month: "2026-07", amount: 5000, quantity: 1 }),
      ],
      paidBlocks: [],
      reports: [],
      year: "2026",
    });

    // June net = 0 - 20000 = -20000; July net = 15000 - 5000 = 10000; total = -10000.
    expect(summary.netIncome).toBe(-10000);
  });

  it("computes net profit as paid earnings plus sales minus the year's expenses", () => {
    const summary = getHostFinancialYearSummary({
      bookings: [paidBooking({ id: "jul", checkIn: "2026-07-02", checkOut: "2026-07-04", totalPrice: 18000 })],
      expenses: [
        expense({ id: "jan", expenseDate: "2026-01-15", month: "2026-01", amount: 500, quantity: 2 }),
        expense({ id: "other-year", expenseDate: "2025-01-15", month: "2025-01", amount: 9999, quantity: 1 }),
      ],
      paidBlocks: [paidBlock({ date: "2026-03-05", totalPrice: 40500 })],
      reports: [
        report({ id: "sale", month: "2026-02", salesAmount: 2000 }),
        report({ id: "other-year-sale", month: "2025-02", salesAmount: 9999 }),
      ],
      year: "2026",
    });

    // bookingPayout 15000 + external 40500 = 55500 paid earnings; + 2000 sales = 57500 income
    expect(summary.bookingPayout).toBe(55500);
    expect(summary.manualSales).toBe(2000);
    expect(summary.expenseTotal).toBe(1000); // 500 * 2, other-year expense excluded
    expect(summary.income).toBe(57500);
    expect(summary.netIncome).toBe(56500); // 57500 - 1000
  });
});
