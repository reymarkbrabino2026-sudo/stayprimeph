import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { saveHostExpense, saveHostMonthlyReport } from "@/app/host/reports/actions";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { readHostExpenses } from "@/lib/host-expense-store";
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

const expenseCategories = ["Cleaning", "Maintenance", "Utilities", "Supplies", "Repairs", "Marketing", "Service fees", "Other"];

export default async function HostReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  const [{ month }, bookings, reports, expenses, users] = await Promise.all([searchParams, getBookings(), readHostMonthlyReports(), readHostExpenses(), getUsers()]);
  const isAdmin = user?.role === "admin";
  const selectedMonth = month?.match(/^\d{4}-\d{2}$/) ? month : currentMonth();
  const scopedReports = isAdmin ? reports : reports.filter((report) => report.hostId === user?.id);
  const currentReport = scopedReports.find((report) => report.hostId === user?.id && report.month === selectedMonth);
  const scopedExpenses = isAdmin ? expenses : expenses.filter((expense) => expense.hostId === user?.id);
  const monthExpenses = scopedExpenses.filter((expense) => expense.month === selectedMonth);
  const scopedBookings = isAdmin ? bookings : bookings.filter((booking) => booking.hostId === user?.id);
  const monthBookings = scopedBookings.filter((booking) => booking.paymentStatus === "paid" && booking.checkIn.startsWith(selectedMonth));
  const bookingSales = monthBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const submittedSales = scopedReports.filter((report) => report.month === selectedMonth).reduce((sum, report) => sum + report.salesAmount, 0);
  const monthlyExpenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const reportedExpenses = scopedReports.filter((report) => report.month === selectedMonth).reduce((sum, report) => sum + report.expensesAmount, 0);

  return (
    <DashboardShell
      title="Host Reports"
      subtitle="Host dashboard"
      description={isAdmin ? "Review monthly host sales, expenses, and itemized submissions." : "Input sales and upload manual expense entries before month end."}
      links={isAdmin ? [{ label: "Admin Overview", href: "/admin/dashboard" }, ...hostLinks] : hostLinks}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Booking sales this month" value={formatCurrency(bookingSales)} />
        <StatsCard label={isAdmin ? "Reported sales" : "Submitted sales"} value={formatCurrency(submittedSales)} />
        <StatsCard label="Manual expenses" value={formatCurrency(monthlyExpenseTotal || reportedExpenses)} />
      </div>

      {!isAdmin ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 soft-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Expense upload</p>
              <h2 className="mt-2 text-2xl font-bold">Add manual expense</h2>
            </div>
            <p className="text-sm text-black/55">Saved expenses feed this month&apos;s report total.</p>
          </div>

          <form action={saveHostExpense} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Expense date
              <input name="expenseDate" type="date" defaultValue={`${selectedMonth}-01`} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Category
              <select name="category" className="min-h-12 rounded-2xl border px-4 font-normal text-black" required>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70">
              Vendor or payee
              <input name="vendor" type="text" maxLength={120} placeholder="Supplier, contractor, utility company" className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 md:col-span-2">
              Receipt reference
              <input name="receiptReference" type="text" maxLength={180} placeholder="Receipt number, invoice link, or payment reference" className="min-h-12 rounded-2xl border px-4 font-normal text-black" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/70 md:col-span-2">
              Description
              <textarea name="description" rows={3} maxLength={500} className="rounded-2xl border px-4 py-3 font-normal text-black" placeholder="Optional notes about the expense." />
            </label>
            <button className="min-h-12 rounded-full bg-[#0b8d65] px-6 font-semibold text-white transition hover:bg-[#076c4d] md:w-fit">
              Save expense
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Manual expenses</p>
            <h2 className="mt-2 text-2xl font-bold">{monthLabel(selectedMonth)} entries</h2>
          </div>
          <p className="text-sm font-semibold text-black/55">Total {formatCurrency(monthlyExpenseTotal)}</p>
        </div>
        {monthExpenses.length === 0 ? (
          <EmptyState title="No expenses yet" body={isAdmin ? "Host expense entries will appear here once submitted." : "Add your first manual expense above."} />
        ) : (
          <DataTable
            headers={isAdmin ? ["Host", "Date", "Category", "Vendor", "Amount", "Receipt", "Notes"] : ["Date", "Category", "Vendor", "Amount", "Receipt", "Notes"]}
            rows={monthExpenses
              .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt))
              .map((expense) => {
                const hostName = users.find((item) => item.id === expense.hostId)?.name ?? "Host";
                const cells = [
                  new Date(`${expense.expenseDate}T00:00:00Z`).toLocaleDateString(),
                  expense.category,
                  expense.vendor,
                  formatCurrency(expense.amount),
                  expense.receiptReference ?? "None",
                  expense.description ?? "None",
                ];
                return isAdmin ? [hostName, ...cells] : cells;
              })}
          />
        )}
      </section>

      {!isAdmin ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 soft-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Monthly report</p>
              <h2 className="mt-2 text-2xl font-bold">{monthLabel(selectedMonth)}</h2>
            </div>
            <p className="text-sm text-black/55">Review totals before the month closes.</p>
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
              <input name="expensesAmount" type="number" min="0" step="0.01" defaultValue={currentReport?.expensesAmount ?? monthlyExpenseTotal} className="min-h-12 rounded-2xl border px-4 font-normal text-black" required />
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
