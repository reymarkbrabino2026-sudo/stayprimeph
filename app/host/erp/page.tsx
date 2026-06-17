import Link from "next/link";
import { BedDouble, CalendarDays, ChartNoAxesCombined, ClipboardList, Database, ReceiptText, UsersRound } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { readHostExpenses } from "@/lib/host-expense-store";
import { hostLinks } from "@/lib/navigation";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";
import { formatCurrency } from "@/lib/utils";

const hostTools = [
  {
    label: "Reservation management",
    href: "/host/bookings",
    icon: CalendarDays,
    adminHref: "/admin/bookings",
  },
  {
    label: "Revenue dashboard",
    href: "/host/earnings",
    icon: ChartNoAxesCombined,
    adminHref: "/admin/payments",
  },
  {
    label: "Expense upload",
    href: "/host/reports",
    icon: ReceiptText,
    adminHref: "/host/reports",
  },
  {
    label: "Operations tracking",
    href: "/host/calendar",
    icon: ClipboardList,
    adminHref: "/admin/listings",
  },
  {
    label: "Customer database",
    href: "/host/messages",
    icon: Database,
    adminHref: "/admin/users",
  },
];

export default async function HostErpPage() {
  const user = await getCurrentUser();
  const [bookings, properties, expenses, users] = await Promise.all([getBookings(), getProperties(), readHostExpenses(), getUsers()]);
  const isAdmin = user?.role === "admin";
  const scopedProperties = isAdmin ? properties : properties.filter((property) => property.hostId === user?.id);
  const scopedBookings = isAdmin ? bookings : bookings.filter((booking) => booking.hostId === user?.id);
  const scopedExpenses = isAdmin ? expenses : expenses.filter((expense) => expense.hostId === user?.id);
  const guestIds = new Set(scopedBookings.map((booking) => booking.guestId));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const paidRevenue = scopedBookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const currentMonthExpenses = scopedExpenses
    .filter((expense) => expense.month === currentMonth)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const openReservations = scopedBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed").length;
  const activeListings = scopedProperties.filter((property) => property.status === "approved").length;

  const metrics = [
    { label: "Open reservations", value: String(openReservations), icon: BedDouble },
    { label: "Host revenue", value: formatCurrency(paidRevenue), icon: ChartNoAxesCombined },
    { label: "Monthly expenses", value: formatCurrency(currentMonthExpenses), icon: ReceiptText },
    { label: "Active listings", value: String(activeListings), icon: ClipboardList },
    { label: "Guest records", value: String(users.filter((guest) => guestIds.has(guest.id)).length), icon: UsersRound },
  ];

  return (
    <DashboardShell
      title="ERP Hospitality Management"
      subtitle="Host dashboard"
      description={isAdmin ? "Admin visibility across host reservations, revenue, operations, and guest records." : "Manage reservations, revenue, operations, and guest records for your hosting business."}
      links={isAdmin ? [{ label: "Admin Overview", href: "/admin/dashboard" }, ...hostLinks] : hostLinks}
    >
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#092634] px-5 pb-6 pt-12 text-white shadow-[0_24px_70px_rgba(9,38,52,0.22)] sm:px-8 sm:pb-8 sm:pt-14">
        <div className="absolute left-1/2 top-0 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#11a878] text-3xl font-extrabold text-white ring-8 ring-[#f8f3ed]">
          2
        </div>
        <div className="mx-auto max-w-3xl rounded-[1.5rem] border-2 border-[#11a878] px-4 pb-5 pt-10 sm:px-6 sm:pb-6">
          <p className="text-center text-sm font-bold uppercase tracking-[0.35em] text-[#1fc48e]">Phase 2</p>
          <h2 className="mt-8 text-center text-2xl font-extrabold sm:text-3xl">Operations command center</h2>
          <div className="mt-8 grid gap-3">
            {hostTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.label}
                  href={isAdmin ? tool.adminHref : tool.href}
                  className="flex min-h-16 items-center gap-3 rounded-xl border border-[#11a878]/45 bg-white/[0.04] px-4 text-base font-semibold text-[#c7dceb] transition hover:border-[#11a878] hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1fc48e]"
                >
                  <Icon className="size-5 shrink-0 text-[#1fc48e]" aria-hidden="true" />
                  <span>{tool.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
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

      <section className="mt-6 rounded-[1.5rem] border border-[#0b8d65]/20 bg-[#f1fbf6] p-5 text-[#174c39] soft-card">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0b8d65]">Month-end reminder</p>
        <h2 className="mt-2 text-xl font-bold text-[#123528]">Input sales and expenses before month end</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#174c39]/80">
          Hosts should enter their sales and expenses at the end of each month so the monthly sales and expenses report is complete.
        </p>
        <Link href="/host/reports" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#0b8d65] px-5 text-sm font-semibold text-white transition hover:bg-[#076c4d]">
          Go to host report
        </Link>
      </section>
    </DashboardShell>
  );
}
