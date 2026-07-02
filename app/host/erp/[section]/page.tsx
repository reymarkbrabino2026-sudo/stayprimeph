import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BedDouble,
  BriefcaseBusiness,
  CalendarCheck2,
  ChevronDown,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  PhilippinePeso,
  Download,
  DoorOpen,
  Eye,
  Filter,
  Gift,
  Heart,
  Mail,
  MoreVertical,
  PiggyBank,
  Plus,
  RefreshCw,
  ReceiptText,
  Search,
  Star,
  Upload,
  UserPlus,
  WalletCards,
  Wrench,
  UsersRound,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CustomerClassificationSelect } from "@/components/host/customer-classification-select";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookings, getBookingsForHost } from "@/lib/bookings";
import { readHostCustomerProfiles } from "@/lib/host-customer-store";
import { hostExpenseTotal } from "@/lib/host-expense-csv";
import { readHostExpenses } from "@/lib/host-expense-store";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { adminLinks, hostLinks } from "@/lib/navigation";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import { getProperties, getPropertiesForHost } from "@/lib/properties";
import type { AvailabilityBlock, Booking, HostCustomerClassification, Property, User } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getUsers } from "@/lib/users";
import { createExternalReservation, updateCustomerClassification } from "./actions";

type ErpSection = "reservations" | "revenue" | "operations" | "customers" | "financial";
type ReservationFilter = "all" | "confirmed" | "pending" | "checked_in" | "checked_out" | "cancelled";
type OperationDepartment = "all" | "front_office" | "housekeeping" | "maintenance" | "engineering";
type OperationTaskStatus = "Pending" | "In Progress" | "Completed" | "Open";
type OperationPriority = "High" | "Medium" | "Low";
type CustomerSegment = "all" | "vip" | "repeat" | "new";
type FinancialReportTab = "overview" | "income" | "expenses" | "cashflow" | "tax" | "custom";

const erpTabs: Array<{
  accent: string;
  bg: string;
  href: string;
  icon: typeof CalendarCheck2;
  id: ErpSection;
  label: string;
}> = [
  { id: "reservations", label: "Reservation Management", href: "/host/erp/reservations", icon: CalendarCheck2, accent: "#119b6e", bg: "#eefbf5" },
  { id: "revenue", label: "Revenue Dashboard", href: "/host/erp/revenue", icon: ChartNoAxesCombined, accent: "#1683bd", bg: "#eef8ff" },
  { id: "operations", label: "Operations Dashboard", href: "/host/erp/operations", icon: ClipboardCheck, accent: "#9346ad", bg: "#fbf0ff" },
  { id: "customers", label: "Customer Database", href: "/host/erp/customers", icon: UsersRound, accent: "#c77a05", bg: "#fff8eb" },
  { id: "financial", label: "Financial Reporting", href: "/host/erp/financial", icon: ReceiptText, accent: "#c7382e", bg: "#fff2f0" },
];

const reservationFilters: Array<{ id: ReservationFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "checked_in", label: "Checked In" },
  { id: "checked_out", label: "Checked Out" },
  { id: "cancelled", label: "Cancelled" },
];

const operationDepartments: Array<{ id: OperationDepartment; label: string }> = [
  { id: "all", label: "All Departments" },
  { id: "front_office", label: "Front Office" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "maintenance", label: "Maintenance" },
  { id: "engineering", label: "Engineering" },
];

const customerSegments: Array<{ id: CustomerSegment; label: string; icon: typeof UsersRound }> = [
  { id: "all", label: "All Customers", icon: UsersRound },
  { id: "vip", label: "VIP", icon: Star },
  { id: "repeat", label: "Repeat Guests", icon: RefreshCw },
  { id: "new", label: "New", icon: UserPlus },
];

const financialReportTabs: Array<{ id: FinancialReportTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "income", label: "Income Statement" },
  { id: "expenses", label: "Expense Breakdown" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "tax", label: "Tax Summary" },
  { id: "custom", label: "Custom Reports" },
];

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validMonthKey(value: string | undefined) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function previousMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return "previous month";
  return monthLabel(new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7));
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function shortMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  return {
    end: new Date(Date.UTC(year, month, 1)),
    start: new Date(Date.UTC(year, month - 1, 1)),
  };
}

function nightsBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function overlapNights(booking: Pick<Booking, "checkIn" | "checkOut">, month: string) {
  const range = monthRange(month);
  const checkIn = new Date(`${booking.checkIn}T00:00:00Z`);
  const checkOut = new Date(`${booking.checkOut}T00:00:00Z`);
  const start = checkIn > range.start ? checkIn : range.start;
  const end = checkOut < range.end ? checkOut : range.end;
  return nightsBetween(start, end);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function guestName(users: User[], id: string) {
  return users.find((user) => user.id === id)?.name ?? "Guest";
}

function guestEmail(users: User[], id: string) {
  const email = users.find((user) => user.id === id)?.email ?? "";
  return email.endsWith("@stayprimeph.local") ? "" : email;
}

function propertyTitle(properties: Property[], id: string) {
  return properties.find((property) => property.id === id)?.title ?? "Property";
}

function propertyRoomLabel(property: Property) {
  const bedroomLabel = property.bedrooms === 1 ? "1 bedroom" : `${property.bedrooms} bedrooms`;
  const guestLabel = property.maxGuests === 1 ? "1 guest" : `${property.maxGuests} guests`;
  return `${bedroomLabel} - up to ${guestLabel}`;
}

function compactCurrency(value: number) {
  if (value >= 1000) return formatCurrency(Math.round(value / 1000) * 1000).replace(/,000(?:\.00)?$/, "k");
  return formatCurrency(value);
}

function reservationCode(booking: Booking) {
  const digits = booking.id.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `RES-${digits}`;
}

function customerCode(userId: string) {
  const digits = userId.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `CUS-${digits}`;
}

function customerInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "G";
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value || "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function dateRangeLabel(month: string) {
  const range = monthRange(month);
  const end = new Date(range.end);
  end.setUTCDate(end.getUTCDate() - 1);
  const formatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(range.start)} - ${formatter.format(end)}`;
}

function compactDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value || "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date);
}

function parseClockTime(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3]?.toUpperCase();

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return { hours, minutes };
}

function displayTime(value: string) {
  const parsed = parseClockTime(value);
  if (!parsed) return value.trim() || "Time unavailable";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, 0, 1, parsed.hours, parsed.minutes)),
  );
}

function bookingCheckInTime(booking: Booking, properties: Property[]) {
  const property = properties.find((item) => item.id === booking.propertyId);
  return property?.bookingPackages?.find((item) => item.id === booking.bookingPackageId)?.checkInTime ?? property?.bookingPackages?.[0]?.checkInTime ?? "15:00";
}

function bookingCheckOutTime(booking: Booking, properties: Property[]) {
  const property = properties.find((item) => item.id === booking.propertyId);
  return property?.bookingPackages?.find((item) => item.id === booking.bookingPackageId)?.checkOutTime ?? property?.bookingPackages?.[0]?.checkOutTime ?? "11:00";
}

function reservationDisplayStatus(booking: Booking, today: string): ReservationFilter {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "completed") return "checked_out";
  if (booking.status === "pending") return "pending";
  if (booking.checkOut <= today) return "checked_out";
  if (booking.checkIn <= today && booking.checkOut > today) return "checked_in";
  return "confirmed";
}

function statusTone(status: ReservationFilter) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (status === "checked_in") return "bg-sky-100 text-sky-700";
  if (status === "checked_out") return "bg-zinc-100 text-zinc-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-black/5 text-black/65";
}

function statusLabel(status: ReservationFilter) {
  return reservationFilters.find((filter) => filter.id === status)?.label ?? status;
}

function customerIsActive(lastStay: string | undefined, today: string) {
  if (!lastStay) return false;
  const daysSinceStay = nightsBetween(new Date(`${lastStay}T00:00:00Z`), new Date(`${today}T00:00:00Z`));
  return daysSinceStay <= 120;
}

function operationDepartmentLabel(value: OperationDepartment) {
  return operationDepartments.find((department) => department.id === value)?.label ?? value;
}

function operationPriorityTone(priority: OperationPriority) {
  if (priority === "High") return "bg-rose-100 text-rose-700";
  if (priority === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

function operationStatusTone(status: OperationTaskStatus) {
  if (status === "Completed") return "bg-emerald-100 text-emerald-700";
  if (status === "In Progress") return "bg-sky-100 text-sky-700";
  if (status === "Open") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function maintenancePriority(block: AvailabilityBlock, today: string, tomorrow: string): OperationPriority {
  if (block.date <= tomorrow) return "High";
  const daysAway = nightsBetween(new Date(`${today}T00:00:00Z`), new Date(`${block.date}T00:00:00Z`));
  return daysAway <= 7 ? "Medium" : "Low";
}

function maintenanceStatus(block: AvailabilityBlock, today: string): OperationTaskStatus {
  return block.date <= today ? "Open" : "Pending";
}

function maintenanceTitle(block: AvailabilityBlock) {
  return block.note?.trim() ? block.note.trim() : "Maintenance request";
}

function expenseColor(index: number) {
  return ["#ef4444", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#64748b"][index % 6];
}

function revenueColor(index: number) {
  return ["#0f9f6e", "#2563eb", "#8b5cf6", "#f59e0b"][index % 4];
}

function ErpTabs({ active, month }: { active: ErpSection; month: string }) {
  return (
    <nav aria-label="ERP sections" className="sticky top-0 z-20 max-w-full overflow-hidden rounded-[1.25rem] border border-black/10 bg-white shadow-[0_12px_32px_rgba(33,23,15,0.08)] sm:static">
      <div className="flex max-w-full snap-x overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-2 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
      {erpTabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={`${tab.href}${buildQuery({ month })}`}
            aria-current={selected ? "page" : undefined}
            className="relative flex min-h-16 min-w-[9.5rem] snap-start flex-col items-center justify-center gap-1.5 border-r border-black/10 px-3 py-3 text-center text-xs font-bold transition active:scale-[0.99] hover:bg-black/[0.02] sm:min-w-[11rem] sm:text-sm md:min-w-0 md:flex-row md:gap-3 md:border-b md:px-4 xl:border-b-0"
            style={{ color: selected ? tab.accent : "rgba(0,0,0,0.62)" }}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="max-w-28 leading-4 md:max-w-none md:leading-5">{tab.label}</span>
            <span className="absolute inset-x-3 bottom-0 h-1 rounded-t-full" style={{ backgroundColor: selected ? tab.accent : "transparent" }} aria-hidden="true" />
          </Link>
        );
      })}
      </div>
    </nav>
  );
}

function ErpMetricCard({
  accent = "#119b6e",
  bg = "#e9f8f1",
  description,
  icon: Icon,
  label,
  value,
}: {
  accent?: string;
  bg?: string;
  description: string;
  icon: typeof CalendarCheck2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.06)] sm:p-5">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full sm:size-12" style={{ backgroundColor: bg, color: accent }}>
          <Icon className="size-4 sm:size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-black/50">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold text-black sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs leading-5 text-black/45">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ReservationStatusPill({ status }: { status: ReservationFilter }) {
  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}>{statusLabel(status)}</span>;
}

function csvCell(value: string | number) {
  const text = String(value).replace(/"/g, "\"\"");
  return `"${text}"`;
}

function ExternalReservationForm({
  currentMonth,
  listings,
}: {
  currentMonth: string;
  listings: Property[];
}) {
  const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-black/70";
  const fieldClass = "min-h-12 w-full min-w-0 rounded-2xl border border-black/10 px-4 text-base font-normal text-black outline-none transition focus:border-[#119b6e] sm:text-sm";

  return (
    <section className="max-w-full overflow-x-hidden border-b border-black/10 bg-[#fbfaf8] p-3 sm:p-6">
      <div className="max-w-full rounded-[1.25rem] border border-[#119b6e]/20 bg-white p-3 shadow-[0_10px_28px_rgba(33,23,15,0.06)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#119b6e]">External reservation</p>
            <h3 className="mt-1 text-xl font-bold">Add custom reservation</h3>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Use this when a guest booked outside StayPrimePH, such as a corporate or direct reservation.
                Saving records the stay, blocks the booking calendar dates, and sends the payment record for platform review.
              </p>
          </div>
          <Link href={`/host/erp/reservations${buildQuery({ month: currentMonth })}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-bold text-black/60 sm:self-start">
            Cancel
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-black/10 p-5 text-sm text-black/55">
            No approved listings are available for external reservations yet.
          </div>
        ) : (
          <form action={createExternalReservation} className="mt-5 grid min-w-0 max-w-full gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
              Listing
              <select name="propertyId" className={fieldClass} required>
                <option value="">Choose listing</option>
                {listings.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
              Booking package
              <select name="bookingPackageId" className={fieldClass}>
                <option value="">Use listing default</option>
                {listings.flatMap((property) =>
                  (property.bookingPackages ?? []).filter((item) => item.enabled).map((item) => (
                    <option key={`${property.id}-${item.id}`} value={item.id}>
                      {property.title} - {item.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
              Guest name
              <input name="guestName" type="text" maxLength={120} className={fieldClass} required />
            </label>
            <label className={`${labelClass} lg:col-span-4`}>
              Guest email
              <input name="guestEmail" type="email" maxLength={160} placeholder="Optional" className={fieldClass} />
            </label>
            <label className={`${labelClass} lg:col-span-4`}>
              Guest phone
              <input name="guestPhone" type="tel" maxLength={60} placeholder="Optional" className={fieldClass} />
            </label>
            <label className={`${labelClass} lg:col-span-2`}>
              Check-in
              <input name="checkIn" type="date" className={fieldClass} required />
            </label>
            <label className={`${labelClass} lg:col-span-2`}>
              Check-out
              <input name="checkOut" type="date" className={fieldClass} required />
            </label>
            <label className={`${labelClass} lg:col-span-2`}>
              Guests
              <input name="guests" type="number" min="1" max="50" defaultValue="1" className={fieldClass} required />
            </label>
            <label className={`${labelClass} lg:col-span-3`}>
              Outside transaction amount
              <input name="totalPrice" type="number" min="1" step="1" placeholder="0" className={fieldClass} required />
            </label>
            <label className={`${labelClass} lg:col-span-3`}>
              Payment method
              <select name="paymentMethod" className={fieldClass} required>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="other">Other / cash</option>
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
              Receipt or transaction reference
              <input name="transactionId" type="text" maxLength={180} placeholder="Reference number, OR number, bank ref" className={fieldClass} required />
            </label>
            <label className={`${labelClass} sm:col-span-2 lg:col-span-8`}>
              Notes
              <input name="notes" type="text" maxLength={500} placeholder="Optional source, company, or payment note" className={fieldClass} />
            </label>
            <div className="sticky bottom-20 z-10 grid min-w-0 max-w-full gap-3 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-[0_14px_36px_rgba(33,23,15,0.14)] backdrop-blur sm:static sm:col-span-2 sm:flex sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none lg:col-span-12">
              <button className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#119b6e] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(17,155,110,0.22)] sm:w-auto sm:px-5 sm:text-base">
                <Plus className="size-4" aria-hidden="true" />
                <span className="truncate">Save external reservation</span>
              </button>
              <Link href={`/host/erp/reservations${buildQuery({ month: currentMonth })}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-black/10 px-5 font-bold text-black/60 sm:w-auto">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function ReservationDashboard({
  activeTab,
  currentMonth,
  filteredCount,
  listings,
  page,
  pageReservations,
  reservationSearch,
  reservationStatus,
  showExternalReservationForm,
  statusCounts,
  totalPages,
  totalReservations,
}: {
  activeTab: (typeof erpTabs)[number];
  currentMonth: string;
  filteredCount: number;
  listings: Property[];
  page: number;
  pageReservations: Array<{
    checkInDate: string;
    checkInTime: string;
    checkOutDate: string;
    checkOutTime: string;
    code: string;
    email: string;
    guest: string;
    guests: number;
    id: string;
    nights: number;
    property: string;
    roomLabel: string;
    status: ReservationFilter;
    total: number;
  }>;
  reservationSearch: string;
  reservationStatus: ReservationFilter;
  showExternalReservationForm: boolean;
  statusCounts: Record<ReservationFilter, number>;
  totalPages: number;
  totalReservations: number;
}) {
  const Icon = activeTab.icon;
  const firstResult = filteredCount === 0 ? 0 : (page - 1) * 5 + 1;
  const lastResult = Math.min(page * 5, filteredCount);
  const queryBase = {
    month: currentMonth,
    q: reservationSearch || undefined,
  };
  const csv = [
    ["Reservation ID", "Guest", "Email", "Property / Room", "Check In", "Check Out", "Nights", "Guests", "Status", "Total"].map(csvCell).join(","),
    ...pageReservations.map((row) =>
      [
        row.code,
        row.guest,
        row.email,
        `${row.property} (${row.roomLabel})`,
        `${row.checkInDate} ${row.checkInTime}`,
        `${row.checkOutDate} ${row.checkOutTime}`,
        row.nights,
        row.guests,
        statusLabel(row.status),
        row.total,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

  return (
    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
      <div className="flex flex-col gap-4 border-b border-black/10 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full text-white sm:size-14" style={{ backgroundColor: activeTab.accent }}>
            <Icon className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold sm:text-2xl">Reservation Management</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">View, manage, and update all reservations in one place.</p>
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download={`stayprimeph-reservations-${currentMonth}.csv`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70"
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </a>
          <details className="relative">
            <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70">
              <Filter className="size-4" aria-hidden="true" />
              Filters
            </summary>
            <form action="/host/erp/reservations" className="fixed inset-x-4 top-24 z-40 grid max-h-[calc(100dvh-8rem)] gap-3 overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-[0_18px_50px_rgba(33,23,15,0.16)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              <label className="grid gap-2 font-semibold text-black/70">
                Month
                <input type="month" name="month" defaultValue={currentMonth} className="min-h-10 rounded-xl border border-black/10 px-3 font-medium" />
              </label>
              <label className="grid gap-2 font-semibold text-black/70">
                Status
                <select name="status" defaultValue={reservationStatus} className="min-h-10 rounded-xl border border-black/10 px-3 font-medium">
                  {reservationFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="q" value={reservationSearch} />
              <button className="min-h-10 rounded-xl bg-[#119b6e] px-4 text-sm font-bold text-white">Apply filters</button>
            </form>
          </details>
          <Link href={`/host/erp/reservations${buildQuery({ month: currentMonth, newReservation: 1 })}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#119b6e] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,155,110,0.25)]">
            <Plus className="size-4" aria-hidden="true" />
            New Reservation
          </Link>
        </div>
      </div>

      {showExternalReservationForm ? <ExternalReservationForm currentMonth={currentMonth} listings={listings} /> : null}

      <div className="border-b border-black/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
            {reservationFilters.map((filter) => {
              const active = reservationStatus === filter.id;
              return (
                <Link
                  key={filter.id}
                  href={`/host/erp/reservations${buildQuery({ ...queryBase, page: 1, status: filter.id === "all" ? undefined : filter.id })}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    active ? "border-[#119b6e]/30 bg-[#eefbf5] text-[#119b6e]" : "border-black/10 bg-white text-black/65 hover:bg-black/[0.02]"
                  }`}
                >
                  {filter.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white text-[#119b6e]" : "bg-black/[0.04] text-black/55"}`}>{statusCounts[filter.id]}</span>
                </Link>
              );
            })}
          </div>
          <form action="/host/erp/reservations" className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" aria-hidden="true" />
            <input type="hidden" name="month" value={currentMonth} />
            {reservationStatus !== "all" ? <input type="hidden" name="status" value={reservationStatus} /> : null}
            <input
              name="q"
              defaultValue={reservationSearch}
              placeholder="Search reservation, guest, or email..."
              className="min-h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-black/35 focus:border-[#119b6e]"
            />
          </form>
        </div>
      </div>

      {pageReservations.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No reservations found" body="Try a different status, month, or search term." />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#fbf7f2] text-xs text-black/50">
                <tr>
                  <th className="w-12 px-4 py-4"><input type="checkbox" aria-label="Select all reservations" className="size-4 rounded border-black/20" /></th>
                  {["Reservation ID", "Guest", "Property / Room", "Check In", "Check Out", "Nights", "Guests", "Status", "Total", "Actions"].map((header) => (
                    <th key={header} className={`px-4 py-4 font-semibold ${header === "Actions" ? "text-right" : ""}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageReservations.map((row) => (
                  <tr key={row.id} className="border-t border-black/10">
                    <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${row.code}`} className="size-4 rounded border-black/20" /></td>
                    <td className="px-4 py-4 font-bold text-black/70">{row.code}</td>
                    <td className="px-4 py-4">
                      <p className="font-bold">{row.guest}</p>
                      <p className="mt-1 text-xs text-black/45">{row.email || "No email on file"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="max-w-52 font-bold">{row.property}</p>
                      <p className="mt-1 text-xs text-black/45">{row.roomLabel}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{row.checkInDate}</p>
                      <p className="mt-1 text-xs text-black/45">{row.checkInTime}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{row.checkOutDate}</p>
                      <p className="mt-1 text-xs text-black/45">{row.checkOutTime}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold">{row.nights}</td>
                    <td className="px-4 py-4 font-semibold">{row.guests}</td>
                    <td className="px-4 py-4"><ReservationStatusPill status={row.status} /></td>
                    <td className="px-4 py-4 font-bold">{formatCurrency(row.total)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/host/bookings?booking=${encodeURIComponent(row.id)}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-bold text-black/70">
                          <Eye className="size-4" aria-hidden="true" />
                          View
                        </Link>
                        <Link
                          href="/host/calendar"
                          className="inline-flex min-h-9 items-center rounded-lg border border-black/10 px-3 text-xs font-bold text-black/70 transition hover:bg-black/[0.04]"
                        >
                          Calendar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {pageReservations.map((row) => (
              <article key={`${row.id}-mobile`} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-black/45">{row.code}</p>
                    <h3 className="mt-1 break-words font-bold">{row.guest}</h3>
                    <p className="mt-1 break-all text-xs text-black/45">{row.email || "No email on file"}</p>
                  </div>
                  <ReservationStatusPill status={row.status} />
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-bold">{row.property}</p>
                    <p className="text-xs text-black/45">{row.roomLabel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-black/45">Check In</p>
                      <p className="font-semibold">{row.checkInDate}</p>
                      <p className="text-xs text-black/45">{row.checkInTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-black/45">Check Out</p>
                      <p className="font-semibold">{row.checkOutDate}</p>
                      <p className="text-xs text-black/45">{row.checkOutTime}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#fbf7f2] p-3">
                    <div><p className="text-xs text-black/45">Nights</p><p className="font-bold">{row.nights}</p></div>
                    <div><p className="text-xs text-black/45">Guests</p><p className="font-bold">{row.guests}</p></div>
                    <div><p className="text-xs text-black/45">Total</p><p className="break-words font-bold">{formatCurrency(row.total)}</p></div>
                  </div>
                </div>
                <Link href={`/host/bookings?booking=${encodeURIComponent(row.id)}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-bold text-black/70">
                  <Eye className="size-4" aria-hidden="true" />
                  View
                </Link>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col gap-4 border-t border-black/10 p-4 text-sm text-black/50 sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {firstResult} to {lastResult} of {filteredCount} results{filteredCount !== totalReservations ? ` from ${totalReservations} reservations` : ""}.</p>
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Link
            href={`/host/erp/reservations${buildQuery({ ...queryBase, status: reservationStatus === "all" ? undefined : reservationStatus, page: Math.max(1, page - 1) })}`}
            className={`grid size-9 place-items-center rounded-lg border border-black/10 font-bold ${page <= 1 ? "pointer-events-none opacity-35" : "text-black/65"}`}
            aria-label="Previous page"
          >
            {"<"}
          </Link>
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/host/erp/reservations${buildQuery({ ...queryBase, status: reservationStatus === "all" ? undefined : reservationStatus, page: pageNumber })}`}
              aria-current={pageNumber === page ? "page" : undefined}
              className={`grid size-9 place-items-center rounded-lg border text-sm font-bold ${
                pageNumber === page ? "border-[#119b6e] bg-[#119b6e] text-white" : "border-black/10 text-black/65"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
          <Link
            href={`/host/erp/reservations${buildQuery({ ...queryBase, status: reservationStatus === "all" ? undefined : reservationStatus, page: Math.min(totalPages, page + 1) })}`}
            className={`grid size-9 place-items-center rounded-lg border border-black/10 font-bold ${page >= totalPages ? "pointer-events-none opacity-35" : "text-black/65"}`}
            aria-label="Next page"
          >
            {">"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function OperationPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function OperationsDashboard({
  activeTab,
  currentMonth,
  department,
  filteredTasks,
  housekeepingCompletion,
  maintenanceRequests,
  recentActivity,
  roomStatus,
  totalTasks,
}: {
  activeTab: (typeof erpTabs)[number];
  currentMonth: string;
  department: OperationDepartment;
  filteredTasks: Array<{
    assignedTo: string;
    department: OperationDepartment;
    due: string;
    href: string;
    id: string;
    priority: OperationPriority;
    property: string;
    status: OperationTaskStatus;
    task: string;
  }>;
  housekeepingCompletion: {
    cleaned: number;
    inProgress: number;
    percentage: number;
    totalRooms: number;
  };
  maintenanceRequests: Array<{
    date: string;
    id: string;
    priority: OperationPriority;
    property: string;
    status: OperationTaskStatus;
    title: string;
  }>;
  recentActivity: Array<{
    body: string;
    icon: typeof CalendarCheck2;
    id: string;
    tone: string;
    title: string;
  }>;
  roomStatus: Array<{
    color: string;
    count: number;
    label: string;
  }>;
  totalTasks: number;
}) {
  const Icon = activeTab.icon;
  const totalRooms = roomStatus.reduce((sum, item) => sum + item.count, 0);
  const roomGradientStops = roomStatus.reduce<{ cursor: number; stops: string[] }>(
    (state, item) => {
      const itemPercent = totalRooms > 0 ? (item.count / totalRooms) * 100 : 0;
      const start = state.cursor;
      const end = state.cursor + itemPercent;
      return { cursor: end, stops: [...state.stops, `${item.color} ${start}% ${end}%`] };
    },
    { cursor: 0, stops: [] },
  ).stops.join(", ");
  const housekeepingGradient = `conic-gradient(#2f73d8 0 ${housekeepingCompletion.percentage}%, #ece7df ${housekeepingCompletion.percentage}% 100%)`;

  return (
    <section className="mt-6 grid gap-5">
      <section className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
        <div className="flex flex-col gap-4 border-b border-black/10 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full text-white sm:size-14" style={{ backgroundColor: activeTab.accent }}>
              <Icon className="size-6 sm:size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold sm:text-2xl">Operations Dashboard</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">Monitor daily operations, housekeeping, maintenance, and tasks.</p>
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,1fr)_auto]">
            <form action="/host/erp/operations" className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-black/70">
              <input type="hidden" name="month" value={currentMonth} />
              <select name="department" defaultValue={department} className="min-h-9 min-w-0 flex-1 bg-transparent pr-6 text-sm font-semibold outline-none" aria-label="Filter operations by department">
                {operationDepartments.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <button className="rounded-lg bg-black/[0.04] px-3 py-1.5 text-xs font-bold text-black/60">Apply</button>
            </form>
            <Link href="/host/calendar" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#9346ad] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(147,70,173,0.24)]">
              <Plus className="size-4" aria-hidden="true" />
              Add Task
            </Link>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.1fr_0.72fr_1.08fr]">
          <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.05)] sm:p-5">
            <h3 className="font-bold">Room Status Overview</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-[170px_1fr] sm:items-center">
              <div className="mx-auto grid size-40 place-items-center rounded-full" style={{ background: roomGradientStops ? `conic-gradient(${roomGradientStops})` : "#ece7df" }}>
                <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className="text-xs text-black/45">Total Rooms</p>
                    <p className="text-3xl font-bold">{totalRooms}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                {roomStatus.map((item) => (
                  <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-black/65"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.label}</span></span>
                    <span className="font-bold">{item.count}</span>
                    <span className="w-12 text-right text-xs text-black/45">{totalRooms > 0 ? `${((item.count / totalRooms) * 100).toFixed(1)}%` : "0%"}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.05)] sm:p-5">
            <h3 className="font-bold">Housekeeping Overview</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-[140px_1fr] xl:grid-cols-1">
              <div className="mx-auto grid size-32 place-items-center rounded-full" style={{ background: housekeepingGradient }}>
                <div className="grid size-20 place-items-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className="text-2xl font-bold">{percent(housekeepingCompletion.percentage)}</p>
                    <p className="text-xs text-black/45">Completed</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-black/55">Total Rooms</span><strong>{housekeepingCompletion.totalRooms}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">Cleaned</span><strong>{housekeepingCompletion.cleaned}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">In Progress</span><strong>{housekeepingCompletion.inProgress}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">Pending</span><strong>{Math.max(0, housekeepingCompletion.totalRooms - housekeepingCompletion.cleaned - housekeepingCompletion.inProgress)}</strong></div>
              </div>
            </div>
            <Link href="/host/calendar" className="mt-5 inline-flex text-sm font-bold text-[#1683bd]">View housekeeping list -&gt;</Link>
          </section>

          <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.05)] sm:p-5">
            <h3 className="font-bold">Maintenance Requests</h3>
            <div className="mt-4 grid gap-3">
              {maintenanceRequests.length === 0 ? <p className="rounded-2xl border border-dashed border-black/10 p-4 text-sm text-black/50">No maintenance requests for this period.</p> : null}
              {maintenanceRequests.slice(0, 4).map((request) => (
                <div key={request.id} className="grid gap-2 rounded-2xl border border-black/10 p-3 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-start">
                  <OperationPill label={request.priority} tone={operationPriorityTone(request.priority)} />
                  <div className="min-w-0">
                    <p className="break-words font-bold">{request.title}</p>
                    <p className="mt-1 break-words text-xs text-black/45">{request.property}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <OperationPill label={request.status} tone={operationStatusTone(request.status)} />
                    <p className="mt-1 text-xs text-black/45">{compactDate(request.date)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/host/calendar" className="mt-4 inline-flex text-sm font-bold text-[#9346ad]">View all requests -&gt;</Link>
          </section>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b border-black/10 p-5">
            <div>
              <h3 className="font-bold">Today&apos;s Task List</h3>
              <p className="mt-1 text-xs text-black/45">{operationDepartmentLabel(department)} - {filteredTasks.length} visible of {totalTasks} tasks</p>
            </div>
            <Link href="/host/calendar" className="text-sm font-bold text-[#9346ad]">View all tasks -&gt;</Link>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No operations tasks found" body="Tasks appear here when checkouts or maintenance blocks need attention." />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[840px] w-full text-left text-sm">
                  <thead className="bg-[#fbf7f2] text-xs text-black/50">
                    <tr>
                      <th className="w-12 px-4 py-4"><input type="checkbox" aria-label="Select all tasks" className="size-4 rounded border-black/20" /></th>
                      {["Task", "Department", "Priority", "Due", "Status", "Assigned To", ""].map((header) => (
                        <th key={header || "actions"} className="px-4 py-4 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.slice(0, 6).map((task) => (
                      <tr key={task.id} className="border-t border-black/10">
                        <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${task.task}`} className="size-4 rounded border-black/20" /></td>
                        <td className="px-4 py-4">
                          <p className="font-bold">{task.task}</p>
                          <p className="mt-1 text-xs text-black/45">{task.property}</p>
                        </td>
                        <td className="px-4 py-4">{operationDepartmentLabel(task.department)}</td>
                        <td className="px-4 py-4"><OperationPill label={task.priority} tone={operationPriorityTone(task.priority)} /></td>
                        <td className="px-4 py-4 font-semibold">{task.due}</td>
                        <td className="px-4 py-4"><OperationPill label={task.status} tone={operationStatusTone(task.status)} /></td>
                        <td className="px-4 py-4">{task.assignedTo}</td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={task.href}
                            aria-label={`Open ${task.task} in bookings or calendar`}
                            className="ml-auto grid size-8 place-items-center rounded-lg border border-black/10 text-black/55 transition hover:bg-black/[0.05] hover:text-black/70"
                          >
                            <MoreVertical className="size-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 md:hidden">
                {filteredTasks.slice(0, 6).map((task) => (
                  <Link key={`${task.id}-mobile`} href={task.href} className="block rounded-2xl border border-black/10 p-4 transition active:bg-black/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="break-words font-bold">{task.task}</h4>
                        <p className="mt-1 break-words text-xs text-black/45">{task.property}</p>
                      </div>
                      <OperationPill label={task.status} tone={operationStatusTone(task.status)} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-black/45">Department</p><p className="font-semibold">{operationDepartmentLabel(task.department)}</p></div>
                      <div><p className="text-xs text-black/45">Due</p><p className="font-semibold">{task.due}</p></div>
                      <div><p className="text-xs text-black/45">Priority</p><OperationPill label={task.priority} tone={operationPriorityTone(task.priority)} /></div>
                      <div><p className="text-xs text-black/45">Assigned</p><p className="font-semibold">{task.assignedTo}</p></div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
          <h3 className="font-bold">Recent Activity</h3>
          <div className="mt-4 grid gap-3">
            {recentActivity.length === 0 ? <p className="rounded-2xl border border-dashed border-black/10 p-4 text-sm text-black/50">No operational activity for today.</p> : null}
            {recentActivity.slice(0, 6).map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={activity.id} className="flex gap-3 rounded-2xl border border-black/10 p-3 text-sm">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${activity.tone}`}>
                    <ActivityIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">{activity.title}</p>
                    <p className="mt-1 text-xs leading-5 text-black/45">{activity.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/host/calendar" className="mt-4 inline-flex text-sm font-bold text-[#9346ad]">View all activity -&gt;</Link>
        </section>
      </section>
    </section>
  );
}

function CustomerStatusPill({ active }: { active: boolean }) {
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function CustomerDashboard({
  activeTab,
  currentMonth,
  customerPage,
  customerSearch,
  customerSegment,
  filteredCount,
  pageCustomers,
  segmentCounts,
  totalCustomers,
  totalPages,
}: {
  activeTab: (typeof erpTabs)[number];
  currentMonth: string;
  customerPage: number;
  customerSearch: string;
  customerSegment: CustomerSegment;
  filteredCount: number;
  pageCustomers: Array<{
    active: boolean;
    bookingCount: number;
    code: string;
    classification: HostCustomerClassification;
    email: string;
    firstBookingMonth: string;
    hostId: string;
    id: string;
    initials: string;
    lastStay: string;
    name: string;
    phone: string;
    repeat: boolean;
    searchText: string;
    totalSpent: number;
    vip: boolean;
  }>;
  segmentCounts: Record<CustomerSegment, number>;
  totalCustomers: number;
  totalPages: number;
}) {
  const Icon = activeTab.icon;
  const firstResult = filteredCount === 0 ? 0 : (customerPage - 1) * 7 + 1;
  const lastResult = Math.min(customerPage * 7, filteredCount);
  const queryBase = {
    month: currentMonth,
    q: customerSearch || undefined,
  };
  const currentCustomerPath = `/host/erp/customers${buildQuery({
    ...queryBase,
    page: customerPage,
    segment: customerSegment === "all" ? undefined : customerSegment,
  })}`;
  const csv = [
    ["Customer ID", "Customer", "Email", "Phone", "Total Bookings", "Total Spent", "Last Stay", "Customer Type", "Status"].map(csvCell).join(","),
    ...pageCustomers.map((customer) =>
      [
        customer.code,
        customer.name,
        customer.email,
        customer.phone,
        customer.bookingCount,
        customer.totalSpent,
        customer.lastStay || "No completed stay",
        customer.classification === "vip" ? "VIP" : "Ordinary",
        customer.active ? "Active" : "Inactive",
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

  return (
    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
      <div className="flex flex-col gap-4 border-b border-black/10 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full text-white sm:size-14" style={{ backgroundColor: activeTab.accent }}>
            <Icon className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold sm:text-2xl">Customer Database</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">View and manage customer profiles and their booking history.</p>
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-4">
          <Link href="/host/bookings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70">
            <Upload className="size-4" aria-hidden="true" />
            Import
          </Link>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download={`stayprimeph-customers-${currentMonth}.csv`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70"
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </a>
          <details className="relative">
            <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70">
              <Filter className="size-4" aria-hidden="true" />
              Filters
            </summary>
            <form action="/host/erp/customers" className="fixed inset-x-4 top-24 z-40 grid max-h-[calc(100dvh-8rem)] gap-3 overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-[0_18px_50px_rgba(33,23,15,0.16)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              <label className="grid gap-2 font-semibold text-black/70">
                Month
                <input type="month" name="month" defaultValue={currentMonth} className="min-h-10 rounded-xl border border-black/10 px-3 font-medium" />
              </label>
              <label className="grid gap-2 font-semibold text-black/70">
                Segment
                <select name="segment" defaultValue={customerSegment} className="min-h-10 rounded-xl border border-black/10 px-3 font-medium">
                  {customerSegments.map((segment) => (
                    <option key={segment.id} value={segment.id}>{segment.label}</option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="q" value={customerSearch} />
              <button className="min-h-10 rounded-xl bg-[#c77a05] px-4 text-sm font-bold text-white">Apply filters</button>
            </form>
          </details>
          <Link href="/host/bookings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f97316] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(249,115,22,0.25)]">
            <Plus className="size-4" aria-hidden="true" />
            Add New Customer
          </Link>
        </div>
      </div>

      <div className="border-b border-black/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
            {customerSegments.map((segment) => {
              const SegmentIcon = segment.icon;
              const active = customerSegment === segment.id;
              return (
                <Link
                  key={segment.id}
                  href={`/host/erp/customers${buildQuery({ ...queryBase, page: 1, segment: segment.id === "all" ? undefined : segment.id })}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    active ? "border-[#f97316]/30 bg-orange-50 text-[#f97316]" : "border-black/10 bg-white text-black/65 hover:bg-black/[0.02]"
                  }`}
                >
                  <SegmentIcon className="size-4" aria-hidden="true" />
                  {segment.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white text-[#f97316]" : "bg-black/[0.04] text-black/55"}`}>{segmentCounts[segment.id]}</span>
                </Link>
              );
            })}
          </div>
          <form action="/host/erp/customers" className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" aria-hidden="true" />
            <input type="hidden" name="month" value={currentMonth} />
            {customerSegment !== "all" ? <input type="hidden" name="segment" value={customerSegment} /> : null}
            <input
              name="q"
              defaultValue={customerSearch}
              placeholder="Search by name, email, phone, or ID..."
              className="min-h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-black/35 focus:border-[#f97316]"
            />
          </form>
        </div>
      </div>

      {pageCustomers.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No customers found" body="Try a different segment, month, or search term." />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-[#fbf7f2] text-xs text-black/50">
                <tr>
                  <th className="w-12 px-4 py-4"><input type="checkbox" aria-label="Select all customers" className="size-4 rounded border-black/20" /></th>
                  {["Customer ID", "Customer", "Contact", "Total Bookings", "Total Spent", "Last Stay", "Type", "Status", "Actions"].map((header) => (
                    <th key={header} className={`px-4 py-4 font-semibold ${header === "Actions" ? "text-right" : ""}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageCustomers.map((customer, index) => (
                  <tr key={customer.id} className="border-t border-black/10">
                    <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${customer.name}`} className="size-4 rounded border-black/20" /></td>
                    <td className="px-4 py-4 font-bold text-black/70">{customer.code}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ backgroundColor: ["#dcfce7", "#dbeafe", "#f3e8ff", "#ffedd5"][index % 4], color: ["#15803d", "#1d4ed8", "#7e22ce", "#c2410c"][index % 4] }}>
                          {customer.initials}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{customer.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-black/45">{customer.email || "No email on file"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{customer.phone || "No phone on file"}</p>
                      <p className="mt-1 text-xs text-black/45">{customer.email || "No email on file"}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold">{customer.bookingCount}</td>
                    <td className="px-4 py-4 font-bold">{formatCurrency(customer.totalSpent)}</td>
                    <td className="px-4 py-4 font-semibold">{customer.lastStay ? displayDate(customer.lastStay) : "No completed stay"}</td>
                    <td className="px-4 py-4">
                      <CustomerClassificationSelect
                        action={updateCustomerClassification}
                        customerName={customer.name}
                        guestId={customer.id}
                        hostId={customer.hostId}
                        returnTo={currentCustomerPath}
                        value={customer.classification}
                      />
                    </td>
                    <td className="px-4 py-4"><CustomerStatusPill active={customer.active} /></td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/host/messages?guest=${encodeURIComponent(customer.id)}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-bold text-black/70">
                          <Eye className="size-4" aria-hidden="true" />
                          View
                        </Link>
                        <Link
                          href="/host/bookings"
                          className="inline-flex min-h-9 items-center rounded-lg border border-black/10 px-3 text-xs font-bold text-black/70 transition hover:bg-black/[0.04]"
                        >
                          Bookings
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {pageCustomers.map((customer, index) => (
              <article key={`${customer.id}-mobile`} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ backgroundColor: ["#dcfce7", "#dbeafe", "#f3e8ff", "#ffedd5"][index % 4], color: ["#15803d", "#1d4ed8", "#7e22ce", "#c2410c"][index % 4] }}>
                      {customer.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black/45">{customer.code}</p>
                      <h3 className="mt-1 break-words font-bold">{customer.name}</h3>
                      <p className="mt-1 break-all text-xs text-black/45">{customer.email || "No email on file"}</p>
                    </div>
                  </div>
                  <div className="grid justify-items-end gap-2">
                    <CustomerClassificationSelect
                      action={updateCustomerClassification}
                      customerName={customer.name}
                      guestId={customer.id}
                      hostId={customer.hostId}
                      returnTo={currentCustomerPath}
                      value={customer.classification}
                    />
                    <CustomerStatusPill active={customer.active} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#fbf7f2] p-3 text-sm">
                  <div><p className="text-xs text-black/45">Bookings</p><p className="font-bold">{customer.bookingCount}</p></div>
                  <div><p className="text-xs text-black/45">Spent</p><p className="break-words font-bold">{formatCurrency(customer.totalSpent)}</p></div>
                  <div><p className="text-xs text-black/45">Last Stay</p><p className="font-bold">{customer.lastStay ? compactDate(customer.lastStay) : "None"}</p></div>
                </div>
                <Link href={`/host/messages?guest=${encodeURIComponent(customer.id)}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-bold text-black/70">
                  <Eye className="size-4" aria-hidden="true" />
                  View
                </Link>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col gap-4 border-t border-black/10 p-4 text-sm text-black/50 sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {firstResult} to {lastResult} of {filteredCount} results{filteredCount !== totalCustomers ? ` from ${totalCustomers} customers` : ""}.</p>
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Link
            href={`/host/erp/customers${buildQuery({ ...queryBase, segment: customerSegment === "all" ? undefined : customerSegment, page: Math.max(1, customerPage - 1) })}`}
            className={`grid size-9 place-items-center rounded-lg border border-black/10 font-bold ${customerPage <= 1 ? "pointer-events-none opacity-35" : "text-black/65"}`}
            aria-label="Previous page"
          >
            {"<"}
          </Link>
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/host/erp/customers${buildQuery({ ...queryBase, segment: customerSegment === "all" ? undefined : customerSegment, page: pageNumber })}`}
              aria-current={pageNumber === customerPage ? "page" : undefined}
              className={`grid size-9 place-items-center rounded-lg border text-sm font-bold ${
                pageNumber === customerPage ? "border-[#f97316] bg-[#f97316] text-white" : "border-black/10 text-black/65"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
          <Link
            href={`/host/erp/customers${buildQuery({ ...queryBase, segment: customerSegment === "all" ? undefined : customerSegment, page: Math.min(totalPages, customerPage + 1) })}`}
            className={`grid size-9 place-items-center rounded-lg border border-black/10 font-bold ${customerPage >= totalPages ? "pointer-events-none opacity-35" : "text-black/65"}`}
            aria-label="Next page"
          >
            {">"}
          </Link>
        </div>
      </div>

      <section className="border-t border-black/10 bg-white p-5">
        <h3 className="font-bold">Customer Management</h3>
        <p className="mt-1 text-sm text-black/50">Tools to help you manage customer relationships and engagement.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/host/reports", icon: Gift, title: "Loyalty Programs", body: "Review repeat and VIP guests" },
            { href: "/host/messages", icon: Mail, title: "Email Campaigns", body: "Follow up with guests" },
            { href: "/host/erp/customers?segment=repeat", icon: UsersRound, title: "Customer Segmentation", body: "Group customers by behavior" },
            { href: "/host/bookings", icon: ClipboardList, title: "Activity Log", body: "View booking activity" },
          ].map((item) => {
            const ManagementIcon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-black/10 p-4 transition hover:bg-black/[0.02]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#f97316]">
                  <ManagementIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{item.title}</span>
                  <span className="mt-1 block text-xs text-black/45">{item.body}</span>
                </span>
                <span className="text-black/35">{" >"}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function FinancialDashboard({
  activeTab,
  currentMonth,
  dailyFinancials,
  expenseCategories,
  financialTab,
  grossProfitMargin,
  monthlySummaries,
  netProfit,
  revenueSources,
  totalExpenses,
  totalRevenue,
}: {
  activeTab: (typeof erpTabs)[number];
  currentMonth: string;
  dailyFinancials: Array<{ day: number; expenses: number; revenue: number }>;
  expenseCategories: Array<{ amount: number; category: string; color: string; percent: number }>;
  financialTab: FinancialReportTab;
  grossProfitMargin: number;
  monthlySummaries: Array<{ averageDailyRevenue: number; expenses: number; margin: number; month: string; netProfit: number; revenue: number }>;
  netProfit: number;
  revenueSources: Array<{ amount: number; color: string; label: string; percent: number }>;
  totalExpenses: number;
  totalRevenue: number;
}) {
  const Icon = activeTab.icon;
  const maxDailyValue = Math.max(1, ...dailyFinancials.map((point) => Math.max(point.revenue, point.expenses)));
  const chartWidth = 520;
  const chartHeight = 180;
  const plotTop = 18;
  const plotBottom = 148;
  const plotLeft = 44;
  const plotRight = 500;
  const revenuePoints = dailyFinancials
    .map((point, index) => {
      const x = dailyFinancials.length <= 1 ? plotLeft : plotLeft + (index / (dailyFinancials.length - 1)) * (plotRight - plotLeft);
      const y = plotBottom - (point.revenue / maxDailyValue) * (plotBottom - plotTop);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const expensePoints = dailyFinancials
    .map((point, index) => {
      const x = dailyFinancials.length <= 1 ? plotLeft : plotLeft + (index / (dailyFinancials.length - 1)) * (plotRight - plotLeft);
      const y = plotBottom - (point.expenses / maxDailyValue) * (plotBottom - plotTop);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const yAxisValues = [maxDailyValue, maxDailyValue * 0.75, maxDailyValue * 0.5, maxDailyValue * 0.25, 0];
  const xAxisDays = [1, 6, 11, 16, 21, 26, dailyFinancials.length].filter((day, index, days) => day <= dailyFinancials.length && days.indexOf(day) === index);
  const shortMonth = shortMonthLabel(currentMonth);
  const reportCsv = [
    ["Month", "Total Revenue", "Total Expenses", "Net Profit", "Gross Profit Margin", "Average Daily Revenue"].map(csvCell).join(","),
    ...monthlySummaries.map((row) =>
      [monthLabel(row.month), row.revenue, row.expenses, row.netProfit, `${percent(row.margin)}`, row.averageDailyRevenue].map(csvCell).join(","),
    ),
  ].join("\n");
  const revenueGradient = revenueSources.reduce<{ cursor: number; stops: string[] }>(
    (state, source) => {
      const start = state.cursor;
      const end = state.cursor + source.percent;
      return { cursor: end, stops: [...state.stops, `${source.color} ${start}% ${end}%`] };
    },
    { cursor: 0, stops: [] },
  ).stops.join(", ");

  return (
    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
      <div className="flex flex-col gap-4 border-b border-black/10 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full text-white sm:size-14" style={{ backgroundColor: activeTab.accent }}>
            <Icon className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold sm:text-2xl">Financial Reporting</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">Analyze financial performance and generate detailed reports.</p>
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <form action="/host/erp/financial" className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-black/70">
            <CalendarCheck2 className="size-4 text-black/45" aria-hidden="true" />
            <input type="month" name="month" defaultValue={currentMonth} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Financial report month" />
            <button className="rounded-lg bg-black/[0.04] px-3 py-1.5 text-xs font-bold text-black/60">Apply</button>
          </form>
          <details className="relative">
            <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70">
              <Filter className="size-4" aria-hidden="true" />
              Filters
            </summary>
            <div className="fixed inset-x-4 top-24 z-40 grid max-h-[calc(100dvh-8rem)] gap-3 overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-[0_18px_50px_rgba(33,23,15,0.16)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              <p className="font-bold">Report range</p>
              <p className="text-black/55">{dateRangeLabel(currentMonth)}</p>
              <Link href="/host/reports" className="min-h-10 rounded-xl bg-[#ef4444] px-4 py-2 text-center text-sm font-bold text-white">Open detailed reports</Link>
            </div>
          </details>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(reportCsv)}`}
            download={`stayprimeph-financial-report-${currentMonth}.csv`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(239,68,68,0.25)]"
          >
            <Download className="size-4" aria-hidden="true" />
            Export Report
          </a>
        </div>
      </div>

      <div className="border-b border-black/10 px-4 sm:px-5">
        <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {financialReportTabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/host/erp/financial${buildQuery({ month: currentMonth, report: tab.id === "overview" ? undefined : tab.id })}`}
              aria-current={financialTab === tab.id ? "page" : undefined}
              className={`relative min-h-14 shrink-0 px-4 text-sm font-bold ${
                financialTab === tab.id ? "text-[#ef4444]" : "text-black/55"
              }`}
            >
              <span className="flex h-full items-center">{tab.label}</span>
              <span className="absolute inset-x-2 bottom-0 h-1 rounded-t-full" style={{ backgroundColor: financialTab === tab.id ? "#ef4444" : "transparent" }} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.05fr_0.8fr_0.82fr]">
        <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.05)] sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold">Revenue Overview</h3>
            <span className="rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-black/60">Daily</span>
          </div>
          <svg role="img" aria-label={`${monthLabel(currentMonth)} revenue and expense chart`} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="mt-4 h-64 w-full">
            {yAxisValues.map((value, index) => {
              const y = plotTop + index * ((plotBottom - plotTop) / 4);
              return (
                <g key={`financial-grid-${index}`}>
                  <text x="8" y={y + 4} className="fill-black/45 text-[10px]">{compactCurrency(value)}</text>
                  <line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 5" />
                </g>
              );
            })}
            <polyline points={expensePoints} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={revenuePoints} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {dailyFinancials.map((point, index) => {
              const x = dailyFinancials.length <= 1 ? plotLeft : plotLeft + (index / (dailyFinancials.length - 1)) * (plotRight - plotLeft);
              const y = plotBottom - (point.revenue / maxDailyValue) * (plotBottom - plotTop);
              return <circle key={`financial-dot-${point.day}`} cx={x} cy={y} r="2.6" fill="#ef4444" />;
            })}
            {xAxisDays.map((day) => {
              const x = dailyFinancials.length <= 1 ? plotLeft : plotLeft + ((day - 1) / (dailyFinancials.length - 1)) * (plotRight - plotLeft);
              return <text key={`financial-x-${day}`} x={x - 12} y="170" className="fill-black/45 text-[10px]">{shortMonth} {day}</text>;
            })}
          </svg>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><p className="text-xs text-black/45">Total Revenue</p><p className="break-words font-bold">{formatCurrency(totalRevenue)}</p></div>
            <div><p className="text-xs text-black/45">Total Expenses</p><p className="break-words font-bold">{formatCurrency(totalExpenses)}</p></div>
            <div><p className="text-xs text-black/45">Net Profit</p><p className="break-words font-bold">{formatCurrency(netProfit)}</p></div>
            <div><p className="text-xs text-black/45">Net Margin</p><p className="font-bold">{percent(grossProfitMargin)}</p></div>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.05)] sm:p-5">
          <h3 className="font-bold">Income vs Expenses</h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr] xl:grid-cols-1">
            <div className="mx-auto grid size-36 place-items-center rounded-full" style={{ background: revenueGradient ? `conic-gradient(${revenueGradient})` : "#ece7df" }}>
              <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-xs text-black/45">Total Revenue</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              {revenueSources.map((source) => (
                <div key={source.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-black/65"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: source.color }} /><span className="truncate">{source.label}</span></span>
                  <strong className="break-words text-right">{formatCurrency(source.amount)}</strong>
                  <span className="w-12 text-right text-xs text-black/45">{source.percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.05)] sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold">Top Expense Categories</h3>
            <span className="rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-black/60">MTD</span>
          </div>
          <div className="mt-4 grid gap-3">
            {expenseCategories.length === 0 ? <p className="rounded-2xl border border-dashed border-black/10 p-4 text-sm text-black/50">No expenses recorded for this period.</p> : null}
            {expenseCategories.slice(0, 6).map((category) => (
              <div key={category.category} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
                <span className="grid size-8 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}>
                  <CreditCard className="size-4" aria-hidden="true" />
                </span>
                <span className="truncate font-semibold">{category.category}</span>
                <strong className="break-words text-right">{formatCurrency(category.amount)}</strong>
                <span className="w-12 text-right text-xs text-black/45">{category.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t border-black/10 pt-4 text-sm">
            <span className="font-bold">Total Expenses</span>
            <strong>{formatCurrency(totalExpenses)}</strong>
          </div>
        </section>
      </div>

      <div className="grid gap-4 p-4 pt-0 sm:p-5 sm:pt-0 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="overflow-hidden rounded-[1.25rem] border border-black/10 bg-white shadow-[0_10px_28px_rgba(33,23,15,0.05)]">
          <div className="border-b border-black/10 p-5">
            <h3 className="font-bold">Monthly Summary</h3>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {monthlySummaries.map((summary) => (
              <article key={`${summary.month}-mobile`} className="rounded-2xl border border-black/10 bg-[#fbfaf8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Month</p>
                    <h4 className="mt-1 break-words font-bold">{monthLabel(summary.month)}</h4>
                  </div>
                  <Link href={`/host/reports?month=${summary.month}`} className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-black/70">View</Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-black/45">Revenue</p>
                    <p className="break-words font-bold">{formatCurrency(summary.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-black/45">Expenses</p>
                    <p className="break-words font-bold">{formatCurrency(summary.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-black/45">Net Profit</p>
                    <p className="break-words font-bold">{formatCurrency(summary.netProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-black/45">Margin</p>
                    <p className="font-bold">{percent(summary.margin)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-white p-3 text-sm">
                  <p className="text-xs text-black/45">Avg. Daily Revenue</p>
                  <p className="mt-1 break-words font-bold">{formatCurrency(summary.averageDailyRevenue)}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-[#fbf7f2] text-xs text-black/50">
                <tr>
                  {["Month", "Total Revenue", "Total Expenses", "Net Profit", "Net Profit Margin", "Avg. Daily Revenue", "Action"].map((header) => (
                    <th key={header} className={`px-4 py-4 font-semibold ${header === "Action" ? "text-right" : ""}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlySummaries.map((summary) => (
                  <tr key={summary.month} className="border-t border-black/10">
                    <td className="px-4 py-4 font-bold">{monthLabel(summary.month)}</td>
                    <td className="px-4 py-4">{formatCurrency(summary.revenue)}</td>
                    <td className="px-4 py-4">{formatCurrency(summary.expenses)}</td>
                    <td className="px-4 py-4 font-bold">{formatCurrency(summary.netProfit)}</td>
                    <td className="px-4 py-4">{percent(summary.margin)}</td>
                    <td className="px-4 py-4">{formatCurrency(summary.averageDailyRevenue)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/host/reports?month=${summary.month}`} className="inline-flex min-h-9 items-center rounded-lg border border-black/10 px-3 text-xs font-bold text-black/70">View Report</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-black/10 bg-white p-5 shadow-[0_10px_28px_rgba(33,23,15,0.05)]">
          <h3 className="font-bold">Quick Reports</h3>
          <div className="mt-4 grid gap-3">
            {[
              { href: "/host/reports", icon: ReceiptText, title: "Income Statement", body: "Detailed income statement report" },
              { href: "/host/reports#expenses", icon: CreditCard, title: "Expense Report", body: "Detailed expense breakdown report" },
              { href: "/host/reports", icon: WalletCards, title: "Tax Summary", body: "VAT and tax summary report" },
              { href: "/host/reports", icon: ChartNoAxesCombined, title: "Cash Flow Statement", body: "Cash flow statement report" },
            ].map((item) => {
              const QuickIcon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="flex items-center gap-3 rounded-2xl border border-black/10 p-3 transition hover:bg-black/[0.02]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-[#ef4444]">
                    <QuickIcon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{item.title}</span>
                    <span className="mt-1 block text-xs text-black/45">{item.body}</span>
                  </span>
                  <span className="text-black/35">{" >"}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

function RevenueMetricCard({ comparisonMonth, label, value }: { comparisonMonth: string; label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.06)] sm:p-5">
      <p className="text-sm text-black/45">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-black sm:text-3xl">{value}</p>
      <p className="mt-3 text-xs text-black/40"><span className="font-semibold text-[#119b6e]">{"\u2014"}</span> vs {comparisonMonth}</p>
    </div>
  );
}

function RevenueDashboard({
  activeTab,
  averageNightlyPayout,
  bookedNights,
  currentMonth,
  dailyRevenue,
  monthlyIncome,
  occupancyRate,
  revenueByRoom,
}: {
  activeTab: (typeof erpTabs)[number];
  averageNightlyPayout: number;
  bookedNights: number;
  currentMonth: string;
  dailyRevenue: Array<{ day: number; revenue: number }>;
  monthlyIncome: number;
  occupancyRate: number;
  revenueByRoom: Array<{ id: string; nights: number; occupancy: number; payout: number; roomLabel: string; title: string }>;
}) {
  const Icon = activeTab.icon;
  const comparisonMonth = previousMonthLabel(currentMonth);
  const shortMonth = shortMonthLabel(currentMonth);
  const maxRevenue = Math.max(80_000, Math.ceil(Math.max(...dailyRevenue.map((point) => point.revenue), 1) / 10_000) * 10_000);
  const chartWidth = 520;
  const chartHeight = 180;
  const plotTop = 18;
  const plotBottom = 148;
  const plotLeft = 44;
  const plotRight = 500;
  const chartPoints = dailyRevenue
    .map((point, index) => {
      const x = dailyRevenue.length <= 1 ? plotLeft : plotLeft + (index / (dailyRevenue.length - 1)) * (plotRight - plotLeft);
      const y = plotBottom - (point.revenue / maxRevenue) * (plotBottom - plotTop);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const yAxisValues = [maxRevenue, maxRevenue * 0.75, maxRevenue * 0.5, maxRevenue * 0.25, 0];
  const xAxisDays = [1, 6, 11, 16, 21, 26, dailyRevenue.length].filter((day, index, days) => day <= dailyRevenue.length && days.indexOf(day) === index);
  const midMonth = dailyRevenue[Math.min(14, Math.max(0, dailyRevenue.length - 1))] ?? { day: 1, revenue: 0 };
  const midMonthX = dailyRevenue.length <= 1 ? plotLeft : plotLeft + ((midMonth.day - 1) / (dailyRevenue.length - 1)) * (plotRight - plotLeft);
  const midMonthY = plotBottom - (midMonth.revenue / maxRevenue) * (plotBottom - plotTop);
  const totalRevenue = revenueByRoom.reduce((sum, room) => sum + room.payout, 0);

  return (
    <section className="mt-6 rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-[0_16px_42px_rgba(33,23,15,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full text-white sm:size-14" style={{ backgroundColor: activeTab.accent }}>
            <Icon className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold sm:text-2xl">Revenue Dashboard</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">Monthly sales, occupancy, and revenue per room are separated here for quick review.</p>
          </div>
        </div>
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-black/70 shadow-[0_8px_20px_rgba(33,23,15,0.05)] sm:w-auto">
          <CalendarCheck2 className="size-4 text-black/45" aria-hidden="true" />
          {monthLabel(currentMonth)}
          <ChevronDown className="size-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RevenueMetricCard label="Monthly sales" value={formatCurrency(monthlyIncome)} comparisonMonth={comparisonMonth} />
        <RevenueMetricCard label="Average nightly payout" value={formatCurrency(averageNightlyPayout)} comparisonMonth={comparisonMonth} />
        <RevenueMetricCard label="Occupancy" value={percent(occupancyRate)} comparisonMonth={comparisonMonth} />
        <RevenueMetricCard label="Booked nights" value={String(bookedNights)} comparisonMonth={comparisonMonth} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.06)] sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold">Monthly sales overview</h3>
            <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 px-3 text-sm font-semibold text-black/65">
              Daily
              <ChevronDown className="size-4 text-black/45" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white">
            <svg role="img" aria-label={`${monthLabel(currentMonth)} daily revenue chart`} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full">
              {yAxisValues.map((value, index) => {
                const y = plotTop + index * ((plotBottom - plotTop) / 4);
                return (
                  <g key={`grid-${index}`}>
                    <text x="8" y={y + 4} className="fill-black/45 text-[10px]">{compactCurrency(value)}</text>
                    <line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 5" />
                  </g>
                );
              })}
              <polyline points={chartPoints} fill="none" stroke={activeTab.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {dailyRevenue.map((point, index) => {
                const x = dailyRevenue.length <= 1 ? plotLeft : plotLeft + (index / (dailyRevenue.length - 1)) * (plotRight - plotLeft);
                const y = plotBottom - (point.revenue / maxRevenue) * (plotBottom - plotTop);
                return <circle key={`dot-${point.day}`} cx={x} cy={y} r="2.8" fill={activeTab.accent} />;
              })}
              <g>
                <rect x={Math.max(plotLeft, Math.min(midMonthX - 22, plotRight - 44))} y={Math.max(20, midMonthY - 48)} width="48" height="36" rx="6" fill="white" stroke="rgba(0,0,0,0.12)" />
                <text x={Math.max(plotLeft + 8, Math.min(midMonthX - 12, plotRight - 34))} y={Math.max(35, midMonthY - 29)} className="fill-black/55 text-[9px]">{shortMonth} {midMonth.day}</text>
                <text x={Math.max(plotLeft + 8, Math.min(midMonthX - 12, plotRight - 34))} y={Math.max(48, midMonthY - 16)} className="fill-black text-[10px] font-bold">{formatCurrency(midMonth.revenue)}</text>
              </g>
              {xAxisDays.map((day) => {
                const x = dailyRevenue.length <= 1 ? plotLeft : plotLeft + ((day - 1) / (dailyRevenue.length - 1)) * (plotRight - plotLeft);
                return <text key={`x-${day}`} x={x - 12} y="170" className="fill-black/45 text-[10px]">{shortMonth} {day}</text>;
              })}
            </svg>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.06)] sm:p-5">
          <h3 className="font-bold">Revenue by room</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
            <DataTable
              headers={["Room", "Nights", "Occupancy", "Revenue"]}
              rows={[
                ...revenueByRoom.map((room) => [
                  <div key={`${room.id}-room`} className="min-w-52">
                    <p className="font-semibold">{room.title}</p>
                    <p className="mt-1 text-xs text-black/50">{room.roomLabel}</p>
                  </div>,
                  String(room.nights),
                  percent(room.occupancy),
                  formatCurrency(room.payout),
                ]),
                [
                  <span key="total-room" className="font-bold">Total</span>,
                  String(bookedNights),
                  percent(occupancyRate),
                  formatCurrency(totalRevenue),
                ],
              ]}
            />
          </div>
        </section>
      </div>
    </section>
  );
}

export default async function HostErpSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  if (!erpTabs.some((tab) => tab.id === section)) notFound();
  const activeSection = section as ErpSection;
  const activeTab = erpTabs.find((tab) => tab.id === activeSection)!;

  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const hostScopeId = user?.id ?? "";
  // Hosts only ever see their own rows (the JS scoping below already enforces this),
  // so fetch host-scoped data at the database level instead of loading the entire
  // platform's bookings/properties on every ERP page load. Admins still see everything.
  const [bookings, properties, users, reports, expenses, availabilityBlocks, customerProfiles] = await Promise.all([
    isAdmin ? getBookings() : getBookingsForHost(hostScopeId),
    isAdmin ? getProperties() : getPropertiesForHost(hostScopeId),
    getUsers(),
    readHostMonthlyReports(),
    readHostExpenses(),
    getAvailabilityBlocks(),
    readHostCustomerProfiles(isAdmin ? undefined : hostScopeId),
  ]);
  const currentMonth = validMonthKey(queryValue(resolvedSearchParams.month)) ?? monthKey();
  const requestedReservationStatus = queryValue(resolvedSearchParams.status) as ReservationFilter | undefined;
  const reservationStatus = reservationFilters.some((filter) => filter.id === requestedReservationStatus) ? requestedReservationStatus! : "all";
  const requestedCustomerSegment = queryValue(resolvedSearchParams.segment) as CustomerSegment | undefined;
  const customerSegment = customerSegments.some((segment) => segment.id === requestedCustomerSegment) ? requestedCustomerSegment! : "all";
  const requestedFinancialTab = queryValue(resolvedSearchParams.report) as FinancialReportTab | undefined;
  const financialTab = financialReportTabs.some((tab) => tab.id === requestedFinancialTab) ? requestedFinancialTab! : "overview";
  const requestedDepartment = queryValue(resolvedSearchParams.department) as OperationDepartment | undefined;
  const operationDepartment = operationDepartments.some((department) => department.id === requestedDepartment) ? requestedDepartment! : "all";
  const reservationSearch = (queryValue(resolvedSearchParams.q) ?? "").trim();
  const requestedPage = Number(queryValue(resolvedSearchParams.page) ?? "1");
  const showExternalReservationForm = queryValue(resolvedSearchParams.newReservation) === "1";
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const scopedProperties = isAdmin ? properties : properties.filter((property) => property.hostId === user?.id);
  const scopedPropertyIds = new Set(scopedProperties.map((property) => property.id));
  const scopedBookings = (isAdmin ? bookings : bookings.filter((booking) => booking.hostId === user?.id))
    .filter((booking) => scopedPropertyIds.has(booking.propertyId));
  const scopedReports = isAdmin ? reports : reports.filter((report) => report.hostId === user?.id);
  const scopedExpenses = isAdmin ? expenses : expenses.filter((expense) => expense.hostId === user?.id);
  const scopedBlocks = availabilityBlocks.filter((block) => scopedPropertyIds.has(block.propertyId));
  const scopedCustomerProfiles = isAdmin ? customerProfiles : customerProfiles.filter((profile) => profile.hostId === user?.id);
  const customerProfileMap = new Map(scopedCustomerProfiles.map((profile) => [`${profile.hostId}:${profile.guestId}`, profile]));

  const activeListings = scopedProperties.filter((property) => property.status === "approved");
  const openReservations = scopedBookings.filter((booking) => booking.status === "pending" || booking.status === "confirmed");
  const arrivals = scopedBookings.filter((booking) => booking.checkIn === today && booking.status !== "cancelled");
  const departures = scopedBookings.filter((booking) => booking.checkOut === today && booking.status !== "cancelled");
  const monthlyPaidBookings = scopedBookings.filter((booking) => booking.paymentStatus === "paid" && overlapNights(booking, currentMonth) > 0);
  const monthlyBookingPayout = monthlyPaidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
  const manualSales = scopedReports.filter((report) => report.month === currentMonth).reduce((sum, report) => sum + report.salesAmount, 0);
  const monthlyExpenses = scopedExpenses.filter((expense) => expense.month === currentMonth).reduce((sum, expense) => sum + hostExpenseTotal(expense), 0);
  const monthlyIncome = monthlyBookingPayout + manualSales;
  const monthlyProfit = monthlyIncome - monthlyExpenses;
  const bookedNights = monthlyPaidBookings.reduce((sum, booking) => sum + overlapNights(booking, currentMonth), 0);
  const daysThisMonth = nightsBetween(monthRange(currentMonth).start, monthRange(currentMonth).end);
  const availableNights = activeListings.length * daysThisMonth;
  const occupancyRate = availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;
  const averageNightlyPayout = bookedNights > 0 ? monthlyBookingPayout / bookedNights : 0;
  const grossProfitMargin = monthlyIncome > 0 ? (monthlyProfit / monthlyIncome) * 100 : 0;
  const averageDailyRevenue = daysThisMonth > 0 ? monthlyIncome / daysThisMonth : 0;
  const dailyRevenue = Array.from({ length: daysThisMonth }, (_, index) => {
    const day = index + 1;
    const date = `${currentMonth}-${String(day).padStart(2, "0")}`;
    const revenue = monthlyPaidBookings.reduce((sum, booking) => {
      if (booking.checkIn > date || booking.checkOut <= date) return sum;
      const bookingNights = Math.max(1, overlapNights(booking, currentMonth));
      return sum + calculateHostPayoutFromTotal(booking.totalPrice) / bookingNights;
    }, 0);

    return { day, revenue: Math.round(revenue) };
  });
  const dailyFinancials = Array.from({ length: daysThisMonth }, (_, index) => {
    const day = index + 1;
    const date = `${currentMonth}-${String(day).padStart(2, "0")}`;
    const bookingRevenue = dailyRevenue[index]?.revenue ?? 0;
    const manualRevenue = scopedReports
      .filter((report) => (report.reportDate ?? `${report.month}-01`) === date)
      .reduce((sum, report) => sum + report.salesAmount, 0);
    const expensesForDay = scopedExpenses.filter((expense) => expense.expenseDate === date).reduce((sum, expense) => sum + hostExpenseTotal(expense), 0);
    return { day, expenses: Math.round(expensesForDay), revenue: Math.round(bookingRevenue + manualRevenue) };
  });
  const expenseCategories = Object.values(
    scopedExpenses
      .filter((expense) => expense.month === currentMonth)
      .reduce<Record<string, { amount: number; category: string }>>((totals, expense) => {
        totals[expense.category] = totals[expense.category] ?? { amount: 0, category: expense.category };
        totals[expense.category].amount += hostExpenseTotal(expense);
        return totals;
      }, {}),
  )
    .sort((a, b) => b.amount - a.amount)
    .map((category, index) => ({
      ...category,
      color: expenseColor(index),
      percent: monthlyExpenses > 0 ? (category.amount / monthlyExpenses) * 100 : 0,
    }));
  const revenueSourceBase = [
    { amount: monthlyBookingPayout, label: "Booking Revenue" },
    { amount: manualSales, label: "Manual Sales" },
    { amount: Math.max(0, monthlyIncome - monthlyBookingPayout - manualSales), label: "Other Revenue" },
  ].filter((source) => source.amount > 0 || monthlyIncome === 0);
  const revenueSources = revenueSourceBase.map((source, index) => ({
    ...source,
    color: revenueColor(index),
    percent: monthlyIncome > 0 ? (source.amount / monthlyIncome) * 100 : 0,
  }));
  const summaryMonths = Array.from({ length: 4 }, (_, index) => shiftMonth(currentMonth, -index));
  const monthlySummaries = summaryMonths.map((month) => {
    const paidBookings = scopedBookings.filter((booking) => booking.paymentStatus === "paid" && overlapNights(booking, month) > 0);
    const bookingPayout = paidBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
    const reportSales = scopedReports.filter((report) => report.month === month).reduce((sum, report) => sum + report.salesAmount, 0);
    const expensesForMonth = scopedExpenses.filter((expense) => expense.month === month).reduce((sum, expense) => sum + hostExpenseTotal(expense), 0);
    const revenue = bookingPayout + reportSales;
    const monthDays = nightsBetween(monthRange(month).start, monthRange(month).end);
    const profit = revenue - expensesForMonth;

    return {
      averageDailyRevenue: monthDays > 0 ? revenue / monthDays : 0,
      expenses: expensesForMonth,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      month,
      netProfit: profit,
      revenue,
    };
  });

  const guestBookingCounts = scopedBookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.guestId] = (counts[booking.guestId] ?? 0) + 1;
    return counts;
  }, {});
  const guestSpend = scopedBookings.reduce<Record<string, number>>((totals, booking) => {
    totals[booking.guestId] = (totals[booking.guestId] ?? 0) + booking.totalPrice;
    return totals;
  }, {});
  const guestHostIds = scopedBookings.reduce<Record<string, Set<string>>>((hostsByGuest, booking) => {
    hostsByGuest[booking.guestId] ??= new Set<string>();
    hostsByGuest[booking.guestId].add(booking.hostId);
    return hostsByGuest;
  }, {});
  const guestIds = Object.keys(guestBookingCounts);
  const repeatGuests = guestIds.filter((guestId) => guestBookingCounts[guestId] > 1).length;
  const firstBookingByGuest = guestIds.reduce<Record<string, Booking | undefined>>((firstBookings, guestId) => {
    firstBookings[guestId] = scopedBookings
      .filter((booking) => booking.guestId === guestId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    return firstBookings;
  }, {});
  const lastStayByGuest = guestIds.reduce<Record<string, Booking | undefined>>((lastStays, guestId) => {
    lastStays[guestId] = scopedBookings
      .filter((booking) => booking.guestId === guestId && booking.status !== "cancelled")
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut))[0];
    return lastStays;
  }, {});
  const newGuestsThisMonth = new Set(guestIds.filter((guestId) => firstBookingByGuest[guestId]?.createdAt.startsWith(currentMonth)));
  const loyalGuests = guestIds.filter((guestId) => guestBookingCounts[guestId] >= 3 || guestSpend[guestId] >= 50_000).length;
  const monthlyCustomerSpend = scopedBookings.filter((booking) => booking.createdAt.startsWith(currentMonth)).reduce((sum, booking) => sum + booking.totalPrice, 0);
  const customerRows = guestIds
    .map((guestId) => {
      const userRecord = users.find((userItem) => userItem.id === guestId);
      const name = userRecord?.name ?? "Guest";
      const email = userRecord?.email ?? "";
      const phone = userRecord?.phone ?? "";
      const firstBooking = firstBookingByGuest[guestId];
      const lastStay = lastStayByGuest[guestId];
      const bookingCount = guestBookingCounts[guestId] ?? 0;
      const totalSpent = guestSpend[guestId] ?? 0;
      const customerHostId = Array.from(guestHostIds[guestId] ?? []).sort()[0] ?? hostScopeId;
      const classification = customerProfileMap.get(`${customerHostId}:${guestId}`)?.classification ?? "ordinary";
      const vip = classification === "vip";
      const repeat = bookingCount > 1;

      return {
        active: customerIsActive(lastStay?.checkOut, today),
        bookingCount,
        code: customerCode(guestId),
        classification,
        email,
        firstBookingMonth: firstBooking?.createdAt.slice(0, 7) ?? "",
        hostId: customerHostId,
        id: guestId,
        initials: customerInitials(name),
        lastStay: lastStay?.checkOut ?? "",
        name,
        phone,
        repeat,
        searchText: [customerCode(guestId), name, email, phone].join(" ").toLowerCase(),
        totalSpent,
        vip,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent || b.bookingCount - a.bookingCount || a.name.localeCompare(b.name));
  const customerSegmentCounts = customerSegments.reduce<Record<CustomerSegment, number>>(
    (counts, segment) => {
      counts[segment.id] =
        segment.id === "all"
          ? customerRows.length
          : customerRows.filter((customer) =>
              segment.id === "vip" ? customer.vip : segment.id === "repeat" ? customer.repeat : customer.firstBookingMonth === currentMonth,
            ).length;
      return counts;
    },
    { all: 0, vip: 0, repeat: 0, new: 0 },
  );
  const normalizedCustomerSearch = reservationSearch.toLowerCase();
  const filteredCustomerRows = customerRows.filter((customer) => {
    const segmentMatches =
      customerSegment === "all" ||
      (customerSegment === "vip" && customer.vip) ||
      (customerSegment === "repeat" && customer.repeat) ||
      (customerSegment === "new" && customer.firstBookingMonth === currentMonth);
    const searchMatches = !normalizedCustomerSearch || customer.searchText.includes(normalizedCustomerSearch);
    return segmentMatches && searchMatches;
  });
  const customersPerPage = 7;
  const totalCustomerPages = Math.max(1, Math.ceil(filteredCustomerRows.length / customersPerPage));
  const customerPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalCustomerPages) : 1;
  const paginatedCustomers = filteredCustomerRows.slice((customerPage - 1) * customersPerPage, customerPage * customersPerPage);
  const maintenanceBlocks = scopedBlocks.filter((block) => block.reason === "maintenance" && block.date >= today);
  const housekeepingQueue = scopedBookings
    .filter((booking) => booking.status !== "cancelled" && (booking.checkOut === today || booking.checkOut === tomorrow))
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  const activeStayPropertyIds = new Set(
    scopedBookings
      .filter((booking) => booking.status !== "cancelled" && booking.checkIn <= today && booking.checkOut > today)
      .map((booking) => booking.propertyId),
  );
  const outOfOrderPropertyIds = new Set(scopedBlocks.filter((block) => block.reason === "maintenance" && block.date === today).map((block) => block.propertyId));
  const outOfServicePropertyIds = new Set(scopedBlocks.filter((block) => block.reason !== "maintenance" && block.date === today).map((block) => block.propertyId));
  const dirtyPropertyIds = new Set(housekeepingQueue.map((booking) => booking.propertyId));
  const occupiedRooms = activeListings.filter((property) => activeStayPropertyIds.has(property.id) && !outOfOrderPropertyIds.has(property.id) && !outOfServicePropertyIds.has(property.id)).length;
  const outOfOrderRooms = activeListings.filter((property) => outOfOrderPropertyIds.has(property.id)).length;
  const outOfServiceRooms = activeListings.filter((property) => outOfServicePropertyIds.has(property.id) && !outOfOrderPropertyIds.has(property.id)).length;
  const vacantDirtyRooms = activeListings.filter(
    (property) => dirtyPropertyIds.has(property.id) && !activeStayPropertyIds.has(property.id) && !outOfOrderPropertyIds.has(property.id) && !outOfServicePropertyIds.has(property.id),
  ).length;
  const vacantCleanRooms = Math.max(0, activeListings.length - occupiedRooms - vacantDirtyRooms - outOfOrderRooms - outOfServiceRooms);
  const roomStatus = [
    { color: "#10b981", count: occupiedRooms, label: "Occupied" },
    { color: "#2f73d8", count: vacantCleanRooms, label: "Vacant Clean" },
    { color: "#f59e0b", count: vacantDirtyRooms, label: "Vacant Dirty" },
    { color: "#ef4444", count: outOfOrderRooms, label: "Out of Order" },
    { color: "#8b8f98", count: outOfServiceRooms, label: "Out of Service" },
  ];
  const housekeepingInProgress = housekeepingQueue.filter((booking) => booking.checkOut === today).length;
  const housekeepingCompletion = {
    cleaned: vacantCleanRooms,
    inProgress: housekeepingInProgress,
    percentage: activeListings.length > 0 ? (vacantCleanRooms / activeListings.length) * 100 : 0,
    totalRooms: activeListings.length,
  };
  const operationMaintenanceRequests = maintenanceBlocks
    .map((block) => ({
      date: block.date,
      id: block.id,
      priority: maintenancePriority(block, today, tomorrow),
      property: propertyTitle(properties, block.propertyId),
      status: maintenanceStatus(block, today),
      title: maintenanceTitle(block),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const urgentMaintenanceRequests = operationMaintenanceRequests.filter((request) => request.priority === "High").length;
  const operationTasks = [
    ...arrivals.map((booking) => ({
      assignedTo: "Unassigned",
      department: "front_office" as OperationDepartment,
      due: displayTime(bookingCheckInTime(booking, scopedProperties)),
      href: `/host/bookings?booking=${encodeURIComponent(booking.id)}`,
      id: `${booking.id}-arrival`,
      priority: "High" as OperationPriority,
      property: propertyTitle(properties, booking.propertyId),
      status: "Pending" as OperationTaskStatus,
      task: `Prepare check-in for ${guestName(users, booking.guestId)}`,
    })),
    ...housekeepingQueue.map((booking) => ({
      assignedTo: "Unassigned",
      department: "housekeeping" as OperationDepartment,
      due: booking.checkOut === today ? displayTime(bookingCheckOutTime(booking, scopedProperties)) : compactDate(booking.checkOut),
      href: `/host/bookings?booking=${encodeURIComponent(booking.id)}`,
      id: `${booking.id}-cleaning`,
      priority: booking.checkOut === today ? ("High" as OperationPriority) : ("Medium" as OperationPriority),
      property: propertyTitle(properties, booking.propertyId),
      status: booking.checkOut === today ? ("In Progress" as OperationTaskStatus) : ("Pending" as OperationTaskStatus),
      task: "Room turnover after checkout",
    })),
    ...maintenanceBlocks.map((block) => ({
      assignedTo: "Unassigned",
      department: "maintenance" as OperationDepartment,
      due: compactDate(block.date),
      href: `/host/calendar?property=${encodeURIComponent(block.propertyId)}`,
      id: `${block.id}-maintenance`,
      priority: maintenancePriority(block, today, tomorrow),
      property: propertyTitle(properties, block.propertyId),
      status: maintenanceStatus(block, today),
      task: maintenanceTitle(block),
    })),
  ].sort((a, b) => {
    const priorityRank: Record<OperationPriority, number> = { High: 0, Medium: 1, Low: 2 };
    return priorityRank[a.priority] - priorityRank[b.priority] || a.due.localeCompare(b.due);
  });
  const filteredOperationTasks = operationTasks.filter((task) => operationDepartment === "all" || task.department === operationDepartment);
  const recentActivity = [
    ...departures.map((booking) => ({
      body: `${propertyTitle(properties, booking.propertyId)} checked out at ${displayTime(bookingCheckOutTime(booking, scopedProperties))}.`,
      icon: DoorOpen,
      id: `${booking.id}-departure-activity`,
      tone: "bg-emerald-100 text-emerald-700",
      title: `${guestName(users, booking.guestId)} checked out`,
    })),
    ...arrivals.map((booking) => ({
      body: `${propertyTitle(properties, booking.propertyId)} is scheduled for ${displayTime(bookingCheckInTime(booking, scopedProperties))}.`,
      icon: CalendarCheck2,
      id: `${booking.id}-arrival-activity`,
      tone: "bg-[#eefbf5] text-[#119b6e]",
      title: `${guestName(users, booking.guestId)} checks in today`,
    })),
    ...housekeepingQueue.map((booking) => ({
      body: `${propertyTitle(properties, booking.propertyId)} turnover due ${booking.checkOut === today ? "today" : "tomorrow"}.`,
      icon: ClipboardCheck,
      id: `${booking.id}-housekeeping-activity`,
      tone: "bg-[#fbf0ff] text-[#9346ad]",
      title: "Housekeeping task queued",
    })),
    ...maintenanceBlocks.map((block) => ({
      body: `${propertyTitle(properties, block.propertyId)} - ${compactDate(block.date)}.`,
      icon: Wrench,
      id: `${block.id}-maintenance-activity`,
      tone: "bg-sky-100 text-sky-700",
      title: maintenanceTitle(block),
    })),
  ];

  const monthReservations = scopedBookings
    .filter((booking) => overlapNights(booking, currentMonth) > 0 || booking.checkIn.startsWith(currentMonth) || booking.checkOut.startsWith(currentMonth))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn) || b.createdAt.localeCompare(a.createdAt));
  const reservationViewRows = monthReservations.map((booking) => {
    const property = scopedProperties.find((item) => item.id === booking.propertyId);
    const checkInTime = bookingCheckInTime(booking, scopedProperties);
    const checkOutTime = bookingCheckOutTime(booking, scopedProperties);

    return {
      checkInDate: displayDate(booking.checkIn),
      checkInTime: displayTime(checkInTime),
      checkOutDate: displayDate(booking.checkOut),
      checkOutTime: displayTime(checkOutTime),
      code: reservationCode(booking),
      email: guestEmail(users, booking.guestId),
      guest: guestName(users, booking.guestId),
      guests: booking.guests,
      id: booking.id,
      nights: overlapNights(booking, currentMonth) || nightsBetween(new Date(`${booking.checkIn}T00:00:00Z`), new Date(`${booking.checkOut}T00:00:00Z`)),
      property: property?.title ?? propertyTitle(properties, booking.propertyId),
      roomLabel: property ? propertyRoomLabel(property) : "Room details unavailable",
      searchText: [
        reservationCode(booking),
        guestName(users, booking.guestId),
        guestEmail(users, booking.guestId),
        property?.title ?? propertyTitle(properties, booking.propertyId),
      ]
        .join(" ")
        .toLowerCase(),
      status: reservationDisplayStatus(booking, today),
      total: booking.totalPrice,
    };
  });
  const statusCounts = reservationFilters.reduce<Record<ReservationFilter, number>>(
    (counts, filter) => {
      counts[filter.id] = filter.id === "all" ? reservationViewRows.length : reservationViewRows.filter((row) => row.status === filter.id).length;
      return counts;
    },
    { all: 0, confirmed: 0, pending: 0, checked_in: 0, checked_out: 0, cancelled: 0 },
  );
  const normalizedSearch = reservationSearch.toLowerCase();
  const filteredReservationRows = reservationViewRows.filter((row) => {
    const statusMatches = reservationStatus === "all" || row.status === reservationStatus;
    const searchMatches = !normalizedSearch || row.searchText.includes(normalizedSearch);
    return statusMatches && searchMatches;
  });
  const reservationsPerPage = 5;
  const totalReservationPages = Math.max(1, Math.ceil(filteredReservationRows.length / reservationsPerPage));
  const reservationPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalReservationPages) : 1;
  const paginatedReservations = filteredReservationRows.slice((reservationPage - 1) * reservationsPerPage, reservationPage * reservationsPerPage);

  const revenueByRoom = activeListings
    .map((property) => {
      const propertyBookings = monthlyPaidBookings.filter((booking) => booking.propertyId === property.id);
      const propertyNights = propertyBookings.reduce((sum, booking) => sum + overlapNights(booking, currentMonth), 0);
      const propertyPayout = propertyBookings.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);
      const propertyOccupancy = daysThisMonth > 0 ? (propertyNights / daysThisMonth) * 100 : 0;

      return {
        id: property.id,
        nights: propertyNights,
        occupancy: propertyOccupancy,
        payout: propertyPayout,
        roomLabel: propertyRoomLabel(property),
        title: property.title,
      };
    })
    .sort((a, b) => b.payout - a.payout);

  const links = isAdmin ? adminLinks : hostLinks;
  const overviewCards =
    activeSection === "operations"
      ? [
          {
            accent: "#119b6e",
            bg: "#e9f8f1",
            description: `${arrivals.filter((booking) => booking.checkIn >= today).length} scheduled today.`,
            icon: CalendarCheck2,
            label: "Today's Check-ins",
            value: String(arrivals.length),
          },
          {
            accent: "#c77a05",
            bg: "#fff4e5",
            description: `${departures.length} checkout${departures.length === 1 ? "" : "s"} due today.`,
            icon: DoorOpen,
            label: "Today's Check-outs",
            value: String(departures.length),
          },
          {
            accent: "#9346ad",
            bg: "#fbf0ff",
            description: `${housekeepingInProgress} in progress.`,
            icon: ClipboardCheck,
            label: "Rooms to Clean",
            value: String(housekeepingQueue.length),
          },
          {
            accent: "#1683bd",
            bg: "#eef8ff",
            description: `${urgentMaintenanceRequests} urgent.`,
            icon: Wrench,
            label: "Maintenance Requests",
            value: String(operationMaintenanceRequests.length),
          },
        ]
      : activeSection === "customers"
        ? [
            {
              accent: "#119b6e",
              bg: "#e9f8f1",
              description: "Guests connected to reservation history.",
              icon: UsersRound,
              label: "Total Customers",
              value: String(customerRows.length),
            },
            {
              accent: "#2563eb",
              bg: "#eff6ff",
              description: `${monthLabel(currentMonth)} first-time guests.`,
              icon: UserPlus,
              label: "New Customers (MTD)",
              value: String(newGuestsThisMonth.size),
            },
            {
              accent: "#9346ad",
              bg: "#fbf0ff",
              description: `${customerRows.length > 0 ? Math.round((repeatGuests / customerRows.length) * 100) : 0}% of total customers.`,
              icon: CalendarCheck2,
              label: "Repeat Guests",
              value: String(repeatGuests),
            },
            {
              accent: "#f97316",
              bg: "#fff7ed",
              description: `${monthLabel(currentMonth)} customer booking value.`,
              icon: PhilippinePeso,
              label: "Total Spending (MTD)",
              value: formatCurrency(monthlyCustomerSpend),
            },
            {
              accent: "#ef4444",
              bg: "#fff1f2",
              description: `${customerRows.length > 0 ? Math.round((loyalGuests / customerRows.length) * 100) : 0}% of total customers.`,
              icon: Heart,
              label: "Loyal Customers",
              value: String(loyalGuests),
            },
          ]
        : activeSection === "financial"
          ? [
              {
                accent: "#119b6e",
                bg: "#e9f8f1",
                description: `${monthLabel(currentMonth)} income.`,
                icon: PhilippinePeso,
                label: "Total Revenue (MTD)",
                value: formatCurrency(monthlyIncome),
              },
              {
                accent: "#f97316",
                bg: "#fff7ed",
                description: `${expenseCategories.length} expense categories.`,
                icon: CreditCard,
                label: "Total Expenses (MTD)",
                value: formatCurrency(monthlyExpenses),
              },
              {
                accent: "#9346ad",
                bg: "#fbf0ff",
                description: "Revenue minus expenses.",
                icon: ChartNoAxesCombined,
                label: "Net Profit (MTD)",
                value: formatCurrency(monthlyProfit),
              },
              {
                accent: "#2563eb",
                bg: "#eff6ff",
                description: "Net profit as a share of revenue.",
                icon: WalletCards,
                label: "Gross Profit Margin",
                value: percent(grossProfitMargin),
              },
              {
                accent: "#ef4444",
                bg: "#fff1f2",
                description: `${monthLabel(currentMonth)} daily average.`,
                icon: ReceiptText,
                label: "Avg. Daily Revenue",
                value: formatCurrency(averageDailyRevenue),
              },
            ]
      : [
          {
            description: "Pending and confirmed bookings.",
            icon: CalendarCheck2,
            label: "Open reservations",
            value: String(openReservations.length),
          },
          {
            description: "Guests scheduled to check in.",
            icon: UsersRound,
            label: "Today arrivals",
            value: String(arrivals.length),
          },
          {
            description: "Guests scheduled to check out.",
            icon: DoorOpen,
            label: "Today departures",
            value: String(departures.length),
          },
          {
            description: `From ${monthLabel(currentMonth)} reservations.`,
            icon: PhilippinePeso,
            label: "Total revenue (MTD)",
            value: formatCurrency(monthlyBookingPayout),
          },
        ];

  return (
    <DashboardShell
      title="ERP Hospitality Management"
      subtitle="Phase 2"
      description="Use each ERP tab to manage one hospitality module at a time."
      links={links}
    >
      <div className="mb-4 flex justify-stretch sm:justify-end">
        <form action={`/host/erp/${activeSection}`} className="inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-black/70 shadow-[0_8px_20px_rgba(33,23,15,0.05)] sm:w-auto">
          <CalendarCheck2 className="size-4 text-black/45" aria-hidden="true" />
          <input type="month" name="month" defaultValue={currentMonth} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Report month" />
          <button className="rounded-lg bg-black/[0.04] px-3 py-1.5 text-xs font-bold text-black/60">Apply</button>
        </form>
      </div>

      <section className={`grid gap-4 md:grid-cols-2 ${activeSection === "customers" || activeSection === "financial" ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        {overviewCards.map((card) => (
          <ErpMetricCard key={card.label} {...card} />
        ))}
      </section>

      <div className="mt-6">
        <ErpTabs active={activeSection} month={currentMonth} />
      </div>

      {activeSection === "reservations" ? (
        <ReservationDashboard
          activeTab={activeTab}
          currentMonth={currentMonth}
          filteredCount={filteredReservationRows.length}
          listings={activeListings}
          page={reservationPage}
          pageReservations={paginatedReservations}
          reservationSearch={reservationSearch}
          reservationStatus={reservationStatus}
          showExternalReservationForm={showExternalReservationForm}
          statusCounts={statusCounts}
          totalPages={totalReservationPages}
          totalReservations={reservationViewRows.length}
        />
      ) : null}

      {activeSection === "revenue" ? (
        <RevenueDashboard
          activeTab={activeTab}
          averageNightlyPayout={averageNightlyPayout}
          bookedNights={bookedNights}
          currentMonth={currentMonth}
          dailyRevenue={dailyRevenue}
          monthlyIncome={monthlyIncome}
          occupancyRate={occupancyRate}
          revenueByRoom={revenueByRoom}
        />
      ) : null}

      {activeSection === "operations" ? (
        <OperationsDashboard
          activeTab={activeTab}
          currentMonth={currentMonth}
          department={operationDepartment}
          filteredTasks={filteredOperationTasks}
          housekeepingCompletion={housekeepingCompletion}
          maintenanceRequests={operationMaintenanceRequests}
          recentActivity={recentActivity}
          roomStatus={roomStatus}
          totalTasks={operationTasks.length}
        />
      ) : null}

      {activeSection === "customers" ? (
        <CustomerDashboard
          activeTab={activeTab}
          currentMonth={currentMonth}
          customerPage={customerPage}
          customerSearch={reservationSearch}
          customerSegment={customerSegment}
          filteredCount={filteredCustomerRows.length}
          pageCustomers={paginatedCustomers}
          segmentCounts={customerSegmentCounts}
          totalCustomers={customerRows.length}
          totalPages={totalCustomerPages}
        />
      ) : null}

      {activeSection === "financial" ? (
        <FinancialDashboard
          activeTab={activeTab}
          currentMonth={currentMonth}
          dailyFinancials={dailyFinancials}
          expenseCategories={expenseCategories}
          financialTab={financialTab}
          grossProfitMargin={grossProfitMargin}
          monthlySummaries={monthlySummaries}
          netProfit={monthlyProfit}
          revenueSources={revenueSources}
          totalExpenses={monthlyExpenses}
          totalRevenue={monthlyIncome}
        />
      ) : null}

      <section className="mt-6 rounded-[1.25rem] bg-white p-4 soft-card sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eefbf5] text-[#119b6e]">
              <BriefcaseBusiness className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-black/35">Management actions</p>
              <h2 className="mt-1 text-xl font-bold">Daily operations</h2>
              <p className="mt-2 text-sm leading-6 text-black/60">Jump to booking, calendar, and report workflows when a task needs deeper action.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/host/bookings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#21170f] px-4 text-sm font-semibold text-white">
              <BedDouble className="size-4" aria-hidden="true" />
              Bookings
            </Link>
            <Link href="/host/calendar" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-black/70">
              <ClipboardList className="size-4" aria-hidden="true" />
              Operations
            </Link>
            <Link href="/host/reports" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-black/70">
              <PiggyBank className="size-4" aria-hidden="true" />
              Reports
            </Link>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
