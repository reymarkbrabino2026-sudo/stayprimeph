import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BedDouble,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Download,
  ReceiptText,
  Upload,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HostExpenseForm } from "@/components/forms/host-expense-form";
import { HostExpenseReview } from "@/components/forms/host-expense-review";
import { HostMonthlyReportActions } from "@/components/forms/host-monthly-report-actions";
import { HostMonthlyReportForm } from "@/components/forms/host-monthly-report-form";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteHostExpense, deleteHostMonthlyReport, importHostExpensesFromCsv, saveHostExpense, saveHostMonthlyReport, updateHostExpense } from "@/app/host/reports/actions";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { csrfFieldName } from "@/lib/csrf-fields";
import { getCsrfToken } from "@/lib/csrf";
import { hostExpenseReportMonth, hostExpensesToCsv, hostExpenseTotal } from "@/lib/host-expense-csv";
import { hostExpenseCategories } from "@/lib/host-expense-categories";
import { readHostExpenses } from "@/lib/host-expense-store";
import { getHostFinancialMonthSummary, paidNightsInMonth } from "@/lib/host-financials";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { hostLinks } from "@/lib/navigation";
import { paidAvailabilityBlocksForProperties } from "@/lib/paid-availability-blocks";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";
import { formatCurrency } from "@/lib/utils";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function ReportMetricCell({
  className = "",
  description,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  className?: string;
  description: string;
  icon: LucideIcon;
  label: string;
  tone?: "negative" | "neutral" | "positive";
  value: string;
}) {
  const toneClass =
    tone === "positive"
      ? "bg-[#dff8ec] text-[#0b8d65]"
      : tone === "negative"
        ? "bg-[#fff0e8] text-[#a9441f]"
        : "bg-white/10 text-white";

  return (
    <div className={`min-w-0 bg-[#21170f] p-3 min-[380px]:p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{label}</p>
          <p className="mt-2 break-words text-xl font-bold leading-tight text-white min-[380px]:text-2xl sm:text-3xl">{value}</p>
        </div>
        <span className={`grid size-8 shrink-0 place-items-center rounded-full min-[380px]:size-9 ${toneClass}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 hidden text-sm leading-5 text-white/55 sm:block">{description}</p>
    </div>
  );
}

function OperationMetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.25rem] bg-white p-3 soft-card sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <p className="min-w-0 text-xs font-semibold leading-5 text-black/55 sm:text-sm">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f7ef] text-[#0b8d65] sm:size-10">
          <Icon className="size-4 sm:size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 break-words text-xl font-bold leading-tight text-[#21170f] sm:mt-4 sm:text-3xl">{value}</p>
    </div>
  );
}

export default async function HostReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ expenseDeleted?: string; expenseError?: string; expenseImported?: string; expenseSaved?: string; expenseUpdated?: string; month?: string; reportDeleted?: string; reportEdit?: string; reportError?: string; reportSaved?: string; salesAdded?: string }>;
}) {
  const user = await getCurrentUser();
  const [{ expenseDeleted, expenseError, expenseImported, expenseSaved, expenseUpdated, month, reportDeleted, reportEdit, reportError, reportSaved, salesAdded }, bookings, availabilityBlocks, reports, expenses, properties, users, csrfToken] = await Promise.all([searchParams, getBookings(), getAvailabilityBlocks(), readHostMonthlyReports(), readHostExpenses(), getProperties(), getUsers(), getCsrfToken()]);
  const isAdmin = user?.role === "admin";
  const selectedMonth = month?.match(/^\d{4}-\d{2}$/) ? month : currentMonth();
  const scopedReports = isAdmin ? reports : reports.filter((report) => report.hostId === user?.id);
  const editingReport = !isAdmin && reportEdit ? scopedReports.find((report) => report.id === reportEdit && report.hostId === user?.id && report.month === selectedMonth) : undefined;
  const isEditingSale = Boolean(editingReport);
  const scopedExpenses = isAdmin ? expenses : expenses.filter((expense) => expense.hostId === user?.id);
  const scopedProperties = isAdmin ? properties : properties.filter((property) => property.hostId === user?.id);
  const scopedBookings = isAdmin ? bookings : bookings.filter((booking) => booking.hostId === user?.id);
  const paidBlocks = paidAvailabilityBlocksForProperties(availabilityBlocks, scopedProperties);
  const financialSummary = getHostFinancialMonthSummary({
    bookings: scopedBookings,
    expenses: scopedExpenses,
    month: selectedMonth,
    paidBlocks,
    reports: scopedReports,
  });
  const {
    bookedNights,
    bookingPayout,
    expenseTotal: monthlyExpenseTotal,
    manualSales,
    monthExpenses,
    monthPaidBlocks,
    netIncome,
    paidBookings: monthBookings,
    selectedMonthReports,
  } = financialSummary;
  const guestIds = new Set(scopedBookings.map((booking) => booking.guestId));
  const hostUsers = users.filter((item) => item.role === "host");
  const hostNameCounts = hostUsers.reduce<Record<string, number>>((counts, host) => {
    const key = host.name.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const hostOptions = hostUsers
    .map((item) => ({
      id: item.id,
      name: hostNameCounts[item.name.trim().toLowerCase()] > 1 ? `${item.name} (${item.email})` : item.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const lifetimeExternalPaidTotal = paidBlocks.reduce((sum, block) => sum + block.totalPrice, 0);
  const lifetimePaidPayout = scopedBookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0) + lifetimeExternalPaidTotal;
  const overallAddedSales = scopedReports.reduce((sum, report) => sum + report.salesAmount, 0);
  const overallExpenses = scopedExpenses.reduce((sum, expense) => sum + hostExpenseTotal(expense), 0);
  const overallNetIncome = lifetimePaidPayout + overallAddedSales - overallExpenses;
  const activeListings = scopedProperties.filter((property) => property.status === "approved").length;
  const availableNights = activeListings * financialSummary.daysInMonth;
  const occupancyRate = availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;
  const averageDailyRate = bookedNights > 0 ? bookingPayout / bookedNights : 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  const openReservations = scopedBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed").length + paidBlocks.filter((block) => block.date >= todayKey).length;
  const financialMetrics = [
    {
      description: "Paid bookings and external blocked-date revenue.",
      icon: Banknote,
      label: "Booking payout",
      tone: "neutral" as const,
      value: formatCurrency(bookingPayout),
    },
    {
      description: `${selectedMonthReports.length} manual sale${selectedMonthReports.length === 1 ? "" : "s"} recorded.`,
      icon: ArrowUpRight,
      label: "Sales",
      tone: "positive" as const,
      value: formatCurrency(manualSales),
    },
    {
      description: `${monthExpenses.length} expense ${monthExpenses.length === 1 ? "entry" : "entries"} recorded.`,
      icon: ArrowDownRight,
      label: "Expenses",
      tone: "negative" as const,
      value: formatCurrency(monthlyExpenseTotal),
    },
  ];
  const operationsMetrics = [
    { label: "Open reservations", value: String(openReservations), icon: BedDouble },
    { label: "Booked nights", value: String(bookedNights), icon: CalendarDays },
    { label: "Occupancy", value: percent(occupancyRate), icon: ChartNoAxesCombined },
    { label: "Average nightly payout", value: formatCurrency(averageDailyRate), icon: ReceiptText },
    { label: "Active listings", value: String(activeListings), icon: ClipboardList },
    { label: "Lifetime paid payout", value: formatCurrency(lifetimePaidPayout), icon: ChartNoAxesCombined },
    { label: "Guest records", value: String(users.filter((guest) => guestIds.has(guest.id)).length), icon: UsersRound },
    { label: "Overall net income", value: formatCurrency(overallNetIncome), icon: CircleDollarSign },
  ];
  const expenseRows = monthExpenses
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt))
    .map((expense) => ({
      ...expense,
      month: hostExpenseReportMonth(expense),
      hostName: users.find((item) => item.id === expense.hostId)?.name ?? "Host",
    }));
  const expenseCsv = hostExpensesToCsv(expenseRows);
  const sortedSelectedMonthReports = selectedMonthReports
    .map((report) => ({
      ...report,
      hostName: users.find((item) => item.id === report.hostId)?.name ?? "Host",
    }))
    .sort((a, b) => (b.reportDate ?? `${b.month}-01`).localeCompare(a.reportDate ?? `${a.month}-01`) || b.updatedAt.localeCompare(a.updatedAt));
  function manualSaleCells(report: (typeof sortedSelectedMonthReports)[number]) {
    return [
      new Date(`${report.reportDate ?? `${report.month}-01`}T00:00:00Z`).toLocaleDateString(),
      formatCurrency(report.salesAmount),
      report.notes ?? "None",
      new Date(report.updatedAt).toLocaleDateString(),
    ];
  }
  const reportRows = sortedSelectedMonthReports
    .map((report) => {
      const cells = manualSaleCells(report);
      return isAdmin ? [report.hostName, ...cells] : cells;
    });
  const propertyById = new Map(scopedProperties.map((property) => [property.id, property]));
  const packagePerformanceGroups = new Map<string, { bookings: number; guests: number; label: string; listing: string; payout: number; units: number }>();
  monthBookings.forEach((booking) => {
    const key = `${booking.propertyId}:${booking.bookingPackageId ?? "stay"}`;
    const current = packagePerformanceGroups.get(key) ?? {
      bookings: 0,
      guests: 0,
      label: booking.bookingPackageName ?? "Stay bookings",
      listing: propertyById.get(booking.propertyId)?.title ?? "Property",
      payout: 0,
      units: 0,
    };

    current.bookings += 1;
    current.guests += booking.guests;
    current.units += paidNightsInMonth(booking, selectedMonth);
    current.payout += calculateHostPayoutFromTotal(booking.totalPrice);
    packagePerformanceGroups.set(key, current);
  });
  monthPaidBlocks.forEach((block) => {
    const key = `${block.propertyId}:${block.bookingPackageId ?? block.reason}`;
    const current = packagePerformanceGroups.get(key) ?? {
      bookings: 0,
      guests: 0,
      label: block.bookingPackageName ?? block.reasonLabel,
      listing: block.propertyTitle,
      payout: 0,
      units: 0,
    };

    current.bookings += 1;
    current.units += 1;
    current.payout += block.totalPrice;
    packagePerformanceGroups.set(key, current);
  });
  const packagePerformance = Array.from(packagePerformanceGroups.values())
    .sort((a, b) => b.payout - a.payout || b.bookings - a.bookings);
  const expenseSuccessMessage = expenseImported
    ? `${expenseImported} expense${expenseImported === "1" ? "" : "s"} imported.`
    : expenseSaved
    ? `${expenseSaved} expense${expenseSaved === "1" ? "" : "s"} saved.`
    : expenseUpdated
      ? "Expense updated."
      : expenseDeleted
        ? "Expense deleted."
        : null;

  return (
    <DashboardShell
      title="Host Reports"
      subtitle="Host dashboard"
      description={isAdmin ? "Review host booking payouts, sales, expenses, and itemized submissions." : "Review booking payouts, sales, and expenses for the selected month."}
      links={isAdmin ? [{ label: "Admin Overview", href: "/admin/dashboard" }, ...hostLinks] : hostLinks}
    >
      <section className="overflow-hidden rounded-[1.25rem] bg-[#21170f] text-white soft-card sm:rounded-[1.75rem]">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,auto)] xl:items-start">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold leading-tight min-[380px]:text-3xl sm:text-4xl">{monthLabel(selectedMonth)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60 sm:mt-3">
              {isAdmin ? "A consolidated view of host payouts, manual sales, and itemized expenses." : "Booking payouts, manual sales, and itemized expenses for this working month."}
            </p>
          </div>

          <form action="/host/reports" method="get" className="grid min-w-0 gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.07] p-3 sm:grid-cols-[minmax(13rem,1fr)_auto] sm:items-end sm:p-4">
            <label className="grid gap-2 text-sm font-semibold text-white/75">
              Month
              <input name="month" type="month" defaultValue={selectedMonth} className="min-h-12 w-full min-w-0 rounded-2xl border-white/10 bg-white px-4 font-normal text-black" required />
            </label>
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 font-semibold text-[#21170f] transition hover:bg-[#f4eee7]">
              <CalendarDays className="size-4" aria-hidden="true" />
              View month
            </button>
          </form>
        </div>

        <div className="grid gap-px border-t border-white/10 bg-white/10 min-[380px]:grid-cols-2 md:grid-cols-4">
          <div className="min-w-0 bg-[#2b1f16] p-3 min-[380px]:col-span-2 min-[380px]:p-4 sm:p-5 md:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Net income</p>
                <p className="mt-2 break-words text-2xl font-bold leading-tight text-white min-[380px]:text-3xl sm:text-4xl">{formatCurrency(netIncome)}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dff8ec] text-[#0b8d65] sm:size-10">
                <CircleDollarSign className="size-4 sm:size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 hidden text-sm leading-5 text-white/55 sm:block">Booking payout plus sales minus expenses.</p>
          </div>
          {financialMetrics.map((metric, index) => (
            <ReportMetricCell key={metric.label} className={index === 2 ? "min-[380px]:col-span-2 md:col-span-1" : ""} {...metric} />
          ))}
        </div>
      </section>

      {expenseError || reportError ? (
        <div className="mt-4 rounded-2xl border border-[#d85d32]/25 bg-[#fff3ed] p-4 text-base font-semibold text-[#8a3519]">
          {expenseError ?? reportError}
        </div>
      ) : null}

      {expenseSuccessMessage || reportSaved || reportDeleted || salesAdded ? (
        <div className="mt-4 rounded-2xl border border-[#0b8d65]/20 bg-[#eefbf5] p-4 text-base font-semibold text-[#075f44]">
          {expenseSuccessMessage ?? (salesAdded ? "Sale added." : reportDeleted ? "Sale deleted." : "Sale saved.")}
        </div>
      ) : null}

      <section className="mt-4 rounded-[1.25rem] bg-white p-4 soft-card sm:rounded-[1.5rem] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Capture today&apos;s activity</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/55">Add manual sales or expenses without leaving the report.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
            <a
              href="#manual-sale-form"
              className="group flex min-h-20 items-center justify-between gap-4 rounded-[1.25rem] bg-[#0b8d65] px-5 py-4 text-white transition hover:bg-[#076c4d]"
            >
              <span className="min-w-0">
                <span className="block text-base font-bold">Add sale</span>
                <span className="mt-1 block truncate text-sm font-semibold text-white/70">{formatCurrency(manualSales)} this month</span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/20">
                <ReceiptText className="size-5" aria-hidden="true" />
              </span>
            </a>
            <a
              href="#manual-expenses"
              className="group flex min-h-20 items-center justify-between gap-4 rounded-[1.25rem] bg-[#21170f] px-5 py-4 text-white transition hover:bg-[#21170f]/90"
            >
              <span className="min-w-0">
                <span className="block text-base font-bold">Add expense</span>
                <span className="mt-1 block truncate text-sm font-semibold text-white/70">{formatCurrency(monthlyExpenseTotal)} this month</span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/20">
                <ClipboardList className="size-5" aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>
      </section>

      <section id="manual-expenses" className="mt-6 scroll-mt-24 rounded-[1.25rem] bg-white p-4 soft-card sm:rounded-[1.5rem] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Add or review expenses</h2>
            <p className="mt-2 text-sm leading-6 text-black/55">{monthLabel(selectedMonth)} cost entries and recent records.</p>
          </div>
          <div className="inline-flex max-w-full flex-wrap items-center gap-3 rounded-full border border-black/10 bg-[#fbfaf8] px-4 py-2 text-sm font-semibold text-black/65">
            <span>{monthExpenses.length} entries</span>
            <span className="h-4 w-px bg-black/10" aria-hidden="true" />
            <span>{formatCurrency(monthlyExpenseTotal)}</span>
          </div>
        </div>

        <HostExpenseForm action={saveHostExpense} categories={hostExpenseCategories} csrfToken={csrfToken} defaultDate={`${selectedMonth}-01`} defaultOpen={Boolean(expenseError)} expandHash="#manual-expenses" hostOptions={isAdmin ? hostOptions : undefined} />

        <div className="mt-6 border-t border-black/10 pt-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-bold">Saved expenses</h3>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="text-sm font-semibold text-black/55">{monthExpenses.length} entries - Total {formatCurrency(monthlyExpenseTotal)}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <details className="group relative w-full sm:w-auto">
                  <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-black/10 px-5 text-sm font-semibold text-black/65 transition hover:border-black/25 hover:text-black sm:w-auto [&::-webkit-details-marker]:hidden">
                    <Upload className="size-4" aria-hidden="true" />
                    Import CSV
                  </summary>
                  <div className="mt-2 min-w-0 rounded-[1.25rem] border border-black/10 bg-white p-3 shadow-xl shadow-black/10 sm:absolute sm:right-0 sm:z-20 sm:w-[30rem]">
                    <form action={importHostExpensesFromCsv} encType="multipart/form-data" className="grid gap-2">
                      <input type="hidden" name={csrfFieldName} value={csrfToken} />
                      <input type="hidden" name="month" value={selectedMonth} />
                      {isAdmin ? (
                        <select name="hostId" className="min-h-11 rounded-full border border-black/10 px-4 text-sm font-semibold text-black/65" required>
                          <option value="">Choose host</option>
                          {hostOptions.map((host) => (
                            <option key={host.id} value={host.id}>{host.name}</option>
                          ))}
                        </select>
                      ) : null}
                      <label className="min-w-0">
                        <span className="sr-only">CSV file</span>
                        <input
                          name="expenseCsv"
                          type="file"
                          accept=".csv,text/csv"
                          className="block min-h-11 w-full rounded-full border border-black/10 text-sm font-semibold text-black/65 file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-[#fbf7f2] file:px-4 file:text-sm file:font-semibold file:text-black/65"
                          required
                        />
                      </label>
                      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#21170f] px-5 text-sm font-semibold text-white transition hover:bg-[#21170f]/90">
                        <Upload className="size-4" aria-hidden="true" />
                        Upload expenses
                      </button>
                    </form>
                  </div>
                </details>
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(`\ufeff${expenseCsv}`)}`}
                  download={`stayprimeph-expenses-${selectedMonth}.csv`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/10 px-5 text-sm font-semibold text-black/65 transition hover:border-black/25 hover:text-black sm:w-auto"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Export CSV
                </a>
              </div>
            </div>
          </div>
          {expenseRows.length > 0 ? (
            <HostExpenseReview
              categories={hostExpenseCategories}
              csrfToken={csrfToken}
              deleteAction={deleteHostExpense}
              expenses={expenseRows}
              isAdmin={isAdmin}
              updateAction={updateHostExpense}
            />
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-black/15 bg-[#fbfaf8] p-5 text-center text-sm text-black/55">
              No expenses for this month.
            </div>
          )}
        </div>
      </section>

      {!isAdmin ? (
        <section id="manual-sale-form" className="mt-6 scroll-mt-24 rounded-[1.25rem] bg-white p-4 soft-card sm:rounded-[1.5rem] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">{isEditingSale ? "Edit sale" : "Add or review sales"}</h2>
              <p className="mt-2 text-sm leading-6 text-black/55">{monthLabel(selectedMonth)} manual revenue and recent records.</p>
              {editingReport ? (
                <p className="mt-2 text-sm text-black/55">
                  Updating the {new Date(`${editingReport.reportDate ?? `${editingReport.month}-01`}T00:00:00Z`).toLocaleDateString()} entry.
                </p>
              ) : null}
            </div>
            <div className="inline-flex max-w-full flex-wrap items-center gap-3 rounded-full border border-black/10 bg-[#fbfaf8] px-4 py-2 text-sm font-semibold text-black/65">
              <span>{selectedMonthReports.length} entries</span>
              <span className="h-4 w-px bg-black/10" aria-hidden="true" />
              <span>{formatCurrency(manualSales)}</span>
            </div>
          </div>

          <HostMonthlyReportForm
            key={editingReport?.id ?? `new-${selectedMonth}`}
            action={saveHostMonthlyReport}
            buttonLabel="Add sale"
            cancelHref={`/host/reports?month=${selectedMonth}#manual-sales`}
            csrfToken={csrfToken}
            defaultDate={editingReport?.reportDate ?? `${selectedMonth}-01`}
            defaultExpenses={0}
            defaultNotes={editingReport?.notes}
            defaultOpen={Boolean(editingReport || reportError)}
            defaultSales={editingReport?.salesAmount}
            expandHash="#manual-sale-form"
            intent={editingReport ? "saveReport" : "addSales"}
            reportId={editingReport?.id}
          />

          <div id="manual-sales" className="mt-6 scroll-mt-6 border-t border-black/10 pt-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">Saved sales</h3>
              </div>
              <p className="text-sm font-semibold text-black/55">{selectedMonthReports.length} entries - Total {formatCurrency(manualSales)}</p>
            </div>
            {selectedMonthReports.length === 0 ? (
              <div className="grid gap-4">
                <EmptyState title="No sales for this month" body={`Add offline event income, adjustments, or other host revenue for ${monthLabel(selectedMonth)}.`} />
              </div>
            ) : (
              <DataTable
                embedded
                headers={["Date", "Amount", "Note", "Updated", "Actions"]}
                rows={sortedSelectedMonthReports.map((report, index) => [
                  ...reportRows[index],
                  <HostMonthlyReportActions
                    key={`${report.id}-actions`}
                    csrfToken={csrfToken}
                    deleteAction={deleteHostMonthlyReport}
                    editHref={`/host/reports?month=${report.month}&reportEdit=${report.id}#manual-sale-form`}
                    report={report}
                  />,
                ])}
              />
            )}
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Saved sales</h2>
            </div>
          </div>
          {selectedMonthReports.length === 0 ? (
            <div className="grid gap-4">
              <EmptyState title="No sales for this month" body="Host sales for the selected month will appear here once submitted." />
            </div>
          ) : (
            <DataTable
              headers={["Host", "Date", "Amount", "Note", "Updated"]}
              rows={reportRows}
            />
          )}
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Month health</h2>
          </div>
        </div>
        <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operationsMetrics.map((metric) => (
            <OperationMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[1.25rem] bg-white p-4 soft-card sm:rounded-[1.5rem] sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Booking mix</h2>
          </div>
          <p className="text-sm font-semibold text-black/55">{monthBookings.length + monthPaidBlocks.length} paid bookings / external blocks in {monthLabel(selectedMonth)}</p>
        </div>
        {packagePerformance.length === 0 ? (
          <EmptyState title="No booking mix yet" body="Paid stay, package, and external blocked-date revenue for the selected month will appear here." />
        ) : (
          <DataTable
            embedded
            headers={["Package", "Listing", "Bookings", "Units", "Guests", "Payout"]}
            rows={packagePerformance.map((item) => [
              item.label,
              item.listing,
              String(item.bookings),
              String(item.units),
              String(item.guests),
              formatCurrency(item.payout),
            ])}
          />
        )}
      </section>
    </DashboardShell>
  );
}
