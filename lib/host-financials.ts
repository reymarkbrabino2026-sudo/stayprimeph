import { hostExpenseReportMonth, hostExpenseTotal } from "@/lib/host-expense-csv";
import type { PaidAvailabilityBlock } from "@/lib/paid-availability-blocks";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import type { Booking, HostExpense, HostMonthlyReport } from "@/lib/types";

export function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { end, start };
}

export function nightsBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

export function paidNightsInMonth(booking: Pick<Booking, "checkIn" | "checkOut">, selectedMonth: string) {
  const range = monthRange(selectedMonth);
  const checkIn = new Date(`${booking.checkIn}T00:00:00Z`);
  const checkOut = new Date(`${booking.checkOut}T00:00:00Z`);
  const overlapStart = checkIn > range.start ? checkIn : range.start;
  const overlapEnd = checkOut < range.end ? checkOut : range.end;
  return nightsBetween(overlapStart, overlapEnd);
}

export function getHostFinancialMonthSummary({
  bookings,
  expenses,
  month,
  paidBlocks,
  reports,
}: {
  bookings: Booking[];
  expenses: HostExpense[];
  month: string;
  paidBlocks: PaidAvailabilityBlock[];
  reports: HostMonthlyReport[];
}) {
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid" && paidNightsInMonth(booking, month) > 0);
  const monthPaidBlocks = paidBlocks.filter((block) => block.date.startsWith(`${month}-`));
  const selectedMonthReports = reports.filter((report) => report.month === month);
  const monthExpenses = expenses.filter((expense) => hostExpenseReportMonth(expense) === month);
  const bookingOnlyPayout = paidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const externalPaidTotal = monthPaidBlocks.reduce((sum, block) => sum + block.totalPrice, 0);
  const bookingPayout = bookingOnlyPayout + externalPaidTotal;
  const manualSales = selectedMonthReports.reduce((sum, report) => sum + report.salesAmount, 0);
  const expenseTotal = monthExpenses.reduce((sum, expense) => sum + hostExpenseTotal(expense), 0);
  const income = bookingPayout + manualSales;
  const netIncome = income - expenseTotal;
  const bookedNights = paidBookings.reduce((sum, booking) => sum + paidNightsInMonth(booking, month), 0) + monthPaidBlocks.length;
  const daysInMonth = nightsBetween(monthRange(month).start, monthRange(month).end);

  return {
    averageDailyRevenue: daysInMonth > 0 ? income / daysInMonth : 0,
    averageNightlyPayout: bookedNights > 0 ? bookingPayout / bookedNights : 0,
    bookedNights,
    bookingOnlyPayout,
    bookingPayout,
    daysInMonth,
    expenseTotal,
    externalPaidTotal,
    income,
    manualSales,
    margin: income > 0 ? (netIncome / income) * 100 : 0,
    monthExpenses,
    monthPaidBlocks,
    netIncome,
    paidBookings,
    selectedMonthReports,
  };
}

export function yearRange(value: string) {
  const year = Number(value);
  return { end: new Date(Date.UTC(year + 1, 0, 1)), start: new Date(Date.UTC(year, 0, 1)) };
}

export function paidNightsInYear(booking: Pick<Booking, "checkIn" | "checkOut">, year: string) {
  const range = yearRange(year);
  const checkIn = new Date(`${booking.checkIn}T00:00:00Z`);
  const checkOut = new Date(`${booking.checkOut}T00:00:00Z`);
  const overlapStart = checkIn > range.start ? checkIn : range.start;
  const overlapEnd = checkOut < range.end ? checkOut : range.end;
  return nightsBetween(overlapStart, overlapEnd);
}

// Whole-year financial summary. Mirrors the month summary's convention (a paid
// booking is counted once, in full, when any of its nights fall in the period),
// so each booking is counted a single time across the year - never double-counted
// the way summing twelve month summaries would for stays that span months.
export function getHostFinancialYearSummary({
  bookings,
  expenses,
  paidBlocks,
  reports,
  year,
}: {
  bookings: Booking[];
  expenses: HostExpense[];
  paidBlocks: PaidAvailabilityBlock[];
  reports: HostMonthlyReport[];
  year: string;
}) {
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid" && paidNightsInYear(booking, year) > 0);
  const yearPaidBlocks = paidBlocks.filter((block) => block.date.startsWith(`${year}-`));
  const yearReports = reports.filter((report) => report.month.startsWith(`${year}-`));
  const yearExpenses = expenses.filter((expense) => hostExpenseReportMonth(expense).startsWith(`${year}-`));
  const bookingOnlyPayout = paidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const externalPaidTotal = yearPaidBlocks.reduce((sum, block) => sum + block.totalPrice, 0);
  const bookingPayout = bookingOnlyPayout + externalPaidTotal;
  const manualSales = yearReports.reduce((sum, report) => sum + report.salesAmount, 0);
  const expenseTotal = yearExpenses.reduce((sum, expense) => sum + hostExpenseTotal(expense), 0);
  const income = bookingPayout + manualSales;
  const netIncome = income - expenseTotal;

  return {
    bookingOnlyPayout,
    bookingPayout,
    expenseTotal,
    externalPaidTotal,
    income,
    manualSales,
    netIncome,
    paidBookings,
    yearExpenses,
    yearPaidBlocks,
    yearReports,
  };
}
