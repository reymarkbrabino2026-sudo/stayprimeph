import { BedDouble, CalendarDays, ChartNoAxesCombined, ClipboardList, ReceiptText, UsersRound } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { HostExpenseForm } from "@/components/forms/host-expense-form";
import { HostExpenseReview } from "@/components/forms/host-expense-review";
import { HostMonthlyReportActions } from "@/components/forms/host-monthly-report-actions";
import { HostMonthlyReportForm } from "@/components/forms/host-monthly-report-form";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteHostExpense, deleteHostMonthlyReport, saveHostExpense, saveHostMonthlyReport, updateHostExpense } from "@/app/host/reports/actions";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getCsrfToken } from "@/lib/csrf";
import { readHostExpenses } from "@/lib/host-expense-store";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { hostLinks } from "@/lib/navigation";
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

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { end, start };
}

function nightsBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function paidNightsInMonth(booking: { checkIn: string; checkOut: string }, selectedMonth: string) {
  const range = monthRange(selectedMonth);
  const checkIn = new Date(`${booking.checkIn}T00:00:00Z`);
  const checkOut = new Date(`${booking.checkOut}T00:00:00Z`);
  const overlapStart = checkIn > range.start ? checkIn : range.start;
  const overlapEnd = checkOut < range.end ? checkOut : range.end;
  return nightsBetween(overlapStart, overlapEnd);
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

const expenseCategories = ["Cleaning", "Maintenance", "Utilities", "Supplies", "Repairs", "Marketing", "Service fees", "Other"];

export default async function HostReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ expenseDeleted?: string; expenseError?: string; expenseSaved?: string; expenseUpdated?: string; month?: string; reportDeleted?: string; reportEdit?: string; reportError?: string; reportSaved?: string; salesAdded?: string }>;
}) {
  const user = await getCurrentUser();
  const [{ expenseDeleted, expenseError, expenseSaved, expenseUpdated, month, reportDeleted, reportEdit, reportError, reportSaved, salesAdded }, bookings, reports, expenses, properties, users, csrfToken] = await Promise.all([searchParams, getBookings(), readHostMonthlyReports(), readHostExpenses(), getProperties(), getUsers(), getCsrfToken()]);
  const isAdmin = user?.role === "admin";
  const selectedMonth = month?.match(/^\d{4}-\d{2}$/) ? month : currentMonth();
  const scopedReports = isAdmin ? reports : reports.filter((report) => report.hostId === user?.id);
  const editingReport = !isAdmin && reportEdit ? scopedReports.find((report) => report.id === reportEdit && report.hostId === user?.id && report.month === selectedMonth) : undefined;
  const isEditingSale = Boolean(editingReport);
  const scopedExpenses = isAdmin ? expenses : expenses.filter((expense) => expense.hostId === user?.id);
  const monthExpenses = scopedExpenses.filter((expense) => expense.month === selectedMonth);
  const scopedProperties = isAdmin ? properties : properties.filter((property) => property.hostId === user?.id);
  const scopedBookings = isAdmin ? bookings : bookings.filter((booking) => booking.hostId === user?.id);
  const monthBookings = scopedBookings.filter((booking) => booking.paymentStatus === "paid" && paidNightsInMonth(booking, selectedMonth) > 0);
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
  const bookingPayout = monthBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const lifetimePaidPayout = scopedBookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const selectedMonthReports = scopedReports.filter((report) => report.month === selectedMonth);
  const manualSales = selectedMonthReports.reduce((sum, report) => sum + report.salesAmount, 0);
  const monthlyExpenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netIncome = bookingPayout + manualSales - monthlyExpenseTotal;
  const bookedNights = monthBookings.reduce((sum, booking) => sum + paidNightsInMonth(booking, selectedMonth), 0);
  const daysInSelectedMonth = nightsBetween(monthRange(selectedMonth).start, monthRange(selectedMonth).end);
  const activeListings = scopedProperties.filter((property) => property.status === "approved").length;
  const availableNights = activeListings * daysInSelectedMonth;
  const occupancyRate = availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;
  const averageDailyRate = bookedNights > 0 ? bookingPayout / bookedNights : 0;
  const openReservations = scopedBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed").length;
  const operationsMetrics = [
    { label: "Open reservations", value: String(openReservations), icon: BedDouble },
    { label: "Booked nights", value: String(bookedNights), icon: CalendarDays },
    { label: "Occupancy", value: percent(occupancyRate), icon: ChartNoAxesCombined },
    { label: "Average nightly payout", value: formatCurrency(averageDailyRate), icon: ReceiptText },
    { label: "Active listings", value: String(activeListings), icon: ClipboardList },
    { label: "Lifetime paid payout", value: formatCurrency(lifetimePaidPayout), icon: ChartNoAxesCombined },
    { label: "Guest records", value: String(users.filter((guest) => guestIds.has(guest.id)).length), icon: UsersRound },
  ];
  const expenseRows = monthExpenses
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt))
    .map((expense) => ({
      ...expense,
      hostName: users.find((item) => item.id === expense.hostId)?.name ?? "Host",
    }));
  const sortedSelectedMonthReports = selectedMonthReports
    .map((report) => ({
      ...report,
      hostName: users.find((item) => item.id === report.hostId)?.name ?? "Host",
    }))
    .sort((a, b) => (b.reportDate ?? `${b.month}-01`).localeCompare(a.reportDate ?? `${a.month}-01`) || b.updatedAt.localeCompare(a.updatedAt));
  const reportRows = sortedSelectedMonthReports
    .map((report) => {
      const cells = [
        new Date(`${report.reportDate ?? `${report.month}-01`}T00:00:00Z`).toLocaleDateString(),
        formatCurrency(report.salesAmount),
        report.notes ?? "None",
        new Date(report.updatedAt).toLocaleDateString(),
      ];
      return isAdmin ? [report.hostName, ...cells] : cells;
    });
  const expenseSuccessMessage = expenseSaved
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
      description={isAdmin ? "Review host booking payouts, manual sales, expenses, and itemized submissions." : "Review booking payouts, manual sales, and expenses for the selected month."}
      links={isAdmin ? [{ label: "Admin Overview", href: "/admin/dashboard" }, ...hostLinks] : hostLinks}
    >
      <section className="rounded-[1.5rem] bg-white p-5 soft-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Working month</p>
            <h2 className="mt-2 text-2xl font-bold">{monthLabel(selectedMonth)}</h2>
          </div>
          <form action="/host/reports" method="get" className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Month
              <input name="month" type="month" defaultValue={selectedMonth} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#21170f] px-5 font-semibold text-white transition hover:bg-[#21170f]/90">
              <CalendarDays className="size-4" aria-hidden="true" />
              View month
            </button>
          </form>
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard description="From paid bookings overlapping this month." label="Paid booking payout" value={formatCurrency(bookingPayout)} />
        <StatsCard description="Offline events, adjustments, or other host revenue." label="Manual sales reported" value={formatCurrency(manualSales)} />
        <StatsCard description="Manual operating costs recorded below." label="Manual expenses" value={formatCurrency(monthlyExpenseTotal)} />
        <StatsCard description="Booking payout plus manual sales minus expenses." label="Net income" value={formatCurrency(netIncome)} />
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationsMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-[1.25rem] bg-white p-5 soft-card">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-black/55">{metric.label}</p>
                <span className="grid size-10 place-items-center rounded-full bg-[#e8f7ef] text-[#0b8d65]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-[#21170f]">{metric.value}</p>
            </div>
          );
        })}
      </section>

      {expenseError || reportError ? (
        <div className="mt-4 rounded-2xl border border-[#d85d32]/25 bg-[#fff3ed] p-4 text-sm font-semibold text-[#8a3519]">
          {expenseError ?? reportError}
        </div>
      ) : null}

      {expenseSuccessMessage || reportSaved || reportDeleted || salesAdded ? (
        <div className="mt-4 rounded-2xl border border-[#0b8d65]/20 bg-[#eefbf5] p-4 text-sm font-semibold text-[#075f44]">
          {expenseSuccessMessage ?? (salesAdded ? "Manual sale added." : reportDeleted ? "Manual sale deleted." : "Manual sale saved.")}
        </div>
      ) : null}

      <section className="mt-6 rounded-[1.5rem] bg-white p-5 soft-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Manual expense entry</p>
            <h2 className="mt-2 text-2xl font-bold">Add manual expenses</h2>
          </div>
          <p className="text-sm font-semibold text-black/55">Current total {formatCurrency(monthlyExpenseTotal)}</p>
        </div>

        <HostExpenseForm action={saveHostExpense} categories={expenseCategories} csrfToken={csrfToken} defaultDate={`${selectedMonth}-01`} hostOptions={isAdmin ? hostOptions : undefined} />

        <div className="mt-6 border-t border-black/10 pt-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Manual expenses</p>
              <h3 className="mt-2 text-xl font-bold">Review entries</h3>
            </div>
            <p className="text-sm font-semibold text-black/55">{monthExpenses.length} entries - Total {formatCurrency(monthlyExpenseTotal)}</p>
          </div>
          <HostExpenseReview
            categories={expenseCategories}
            csrfToken={csrfToken}
            deleteAction={deleteHostExpense}
            expenses={expenseRows}
            isAdmin={isAdmin}
            updateAction={updateHostExpense}
          />
        </div>
      </section>

      {!isAdmin ? (
        <section id="manual-sale-form" className="mt-6 scroll-mt-6 rounded-[1.5rem] bg-white p-5 soft-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Manual sales</p>
              <h2 className="mt-2 text-2xl font-bold">{isEditingSale ? "Edit manual sale" : "Add manual sale"}</h2>
              {editingReport ? (
                <p className="mt-2 text-sm text-black/55">
                  Updating the {new Date(`${editingReport.reportDate ?? `${editingReport.month}-01`}T00:00:00Z`).toLocaleDateString()} entry.
                </p>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-black/55">Total {formatCurrency(manualSales)}</p>
          </div>

          <HostMonthlyReportForm
            key={editingReport?.id ?? `new-${selectedMonth}`}
            action={saveHostMonthlyReport}
            buttonLabel="Add manual sale"
            cancelHref={`/host/reports?month=${selectedMonth}#manual-sales`}
            csrfToken={csrfToken}
            defaultDate={editingReport?.reportDate ?? `${selectedMonth}-01`}
            defaultExpenses={0}
            defaultNotes={editingReport?.notes}
            defaultOpen={Boolean(reportError) || Boolean(editingReport)}
            defaultSales={editingReport?.salesAmount}
            intent={editingReport ? "saveReport" : "addSales"}
            reportId={editingReport?.id}
          />

          <div id="manual-sales" className="mt-6 scroll-mt-6 border-t border-black/10 pt-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Manual sales</p>
                <h3 className="mt-2 text-xl font-bold">Sales entries</h3>
              </div>
            </div>
            {selectedMonthReports.length === 0 ? (
              <EmptyState title="No manual sales for this month" body={`Add offline event income, adjustments, or other host revenue for ${monthLabel(selectedMonth)}.`} />
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
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Manual sales</p>
              <h2 className="mt-2 text-2xl font-bold">Sales entries</h2>
            </div>
          </div>
          {selectedMonthReports.length === 0 ? (
            <EmptyState title="No manual sales for this month" body="Host manual sales for the selected month will appear here once submitted." />
          ) : (
            <DataTable
              headers={["Host", "Date", "Amount", "Note", "Updated"]}
              rows={reportRows}
            />
          )}
        </section>
      ) : null}
    </DashboardShell>
  );
}
