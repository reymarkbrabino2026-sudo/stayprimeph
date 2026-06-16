import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { saveHostMonthlyReport } from "@/app/host/reports/actions";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { hostLinks } from "@/lib/navigation";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
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

export default async function HostReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  const [{ month }, bookings, reports, users] = await Promise.all([searchParams, getBookings(), readHostMonthlyReports(), getUsers()]);
  const isAdmin = user?.role === "admin";
  const selectedMonth = month?.match(/^\d{4}-\d{2}$/) ? month : currentMonth();
  const scopedReports = isAdmin ? reports : reports.filter((report) => report.hostId === user?.id);
  const currentReport = scopedReports.find((report) => report.hostId === user?.id && report.month === selectedMonth);
  const scopedBookings = isAdmin ? bookings : bookings.filter((booking) => booking.hostId === user?.id);
  const monthBookings = scopedBookings.filter((booking) => booking.paymentStatus === "paid" && booking.checkIn.startsWith(selectedMonth));
  const bookingSales = monthBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const submittedSales = scopedReports.filter((report) => report.month === selectedMonth).reduce((sum, report) => sum + report.salesAmount, 0);
  const submittedExpenses = scopedReports.filter((report) => report.month === selectedMonth).reduce((sum, report) => sum + report.expensesAmount, 0);

  return (
    <DashboardShell
      title="Host Reports"
      subtitle="Host dashboard"
      description={isAdmin ? "Review monthly host sales and expenses submissions." : "Input your monthly sales and expenses before month end."}
      links={isAdmin ? [{ label: "Admin Overview", href: "/admin/dashboard" }, ...hostLinks] : hostLinks}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Booking sales this month" value={formatCurrency(bookingSales)} />
        <StatsCard label="Submitted sales" value={formatCurrency(submittedSales)} />
        <StatsCard label="Submitted expenses" value={formatCurrency(submittedExpenses)} />
      </div>

      {!isAdmin ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 soft-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Monthly report</p>
              <h2 className="mt-2 text-2xl font-bold">{monthLabel(selectedMonth)}</h2>
            </div>
            <p className="text-sm text-black/55">Complete this before the month closes.</p>
          </div>

          <form action={saveHostMonthlyReport} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Report month
              <input name="month" type="month" defaultValue={selectedMonth} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Sales
              <input name="salesAmount" type="number" min="0" step="0.01" defaultValue={currentReport?.salesAmount ?? bookingSales} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Expenses
              <input name="expensesAmount" type="number" min="0" step="0.01" defaultValue={currentReport?.expensesAmount ?? 0} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 md:col-span-2">
              Notes
              <textarea name="notes" defaultValue={currentReport?.notes} rows={4} className="rounded-2xl border px-4 py-3 font-normal text-black" placeholder="Optional notes about receipts, adjustments, or other expenses." />
            </label>
            <button className="min-h-12 rounded-full bg-[#21170f] px-6 font-semibold text-white transition hover:bg-[#21170f]/90 md:w-fit">
              Save monthly report
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Submitted reports</p>
            <h2 className="mt-2 text-2xl font-bold">Sales and expenses</h2>
          </div>
        </div>
        {scopedReports.length === 0 ? (
          <EmptyState title="No reports yet" body={isAdmin ? "Host sales and expense reports will appear here once submitted." : "Submit your first month-end sales and expenses report above."} />
        ) : (
          <DataTable
            headers={isAdmin ? ["Host", "Month", "Sales", "Expenses", "Net", "Updated"] : ["Month", "Sales", "Expenses", "Net", "Updated"]}
            rows={scopedReports
              .sort((a, b) => b.month.localeCompare(a.month))
              .map((report) => {
                const hostName = users.find((item) => item.id === report.hostId)?.name ?? "Host";
                const cells = [
                  monthLabel(report.month),
                  formatCurrency(report.salesAmount),
                  formatCurrency(report.expensesAmount),
                  formatCurrency(report.salesAmount - report.expensesAmount),
                  new Date(report.updatedAt).toLocaleDateString(),
                ];
                return isAdmin ? [hostName, ...cells] : cells;
              })}
          />
        )}
      </section>
    </DashboardShell>
  );
}
