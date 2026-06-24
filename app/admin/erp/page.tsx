import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminPayments, getPlatformLedger } from "@/lib/admin-data";
import { getBookings } from "@/lib/bookings";
import { adminLinks } from "@/lib/navigation";
import { formatPaymentMethod } from "@/lib/payments";
import { calculateHostPayoutFromTotal, calculateStayprimeMarkupFromTotal, STAYPRIME_MARKUP_RATE } from "@/lib/pricing";
import { getProperties } from "@/lib/properties";
import type { Booking, Payment, PlatformLedgerEntry } from "@/lib/types";
import { getUsers } from "@/lib/users";
import { formatCurrency, formatDate } from "@/lib/utils";

const stayprimeMarkupLabel = `${Math.round(STAYPRIME_MARKUP_RATE * 100)}%`;

function isVerifiedPaymentStatus(paymentStatus: string) {
  return paymentStatus === "paid" || paymentStatus === "partially_paid";
}

function isFullyPaid(paymentStatus: string) {
  return paymentStatus === "paid";
}

function paymentReceivedAmount(booking: Booking, payment?: Payment) {
  if (payment && isVerifiedPaymentStatus(payment.paymentStatus)) return payment.amount;
  if (booking.paymentStatus === "paid") return booking.totalPrice;
  return 0;
}

function paymentTimestamp(payment: Payment) {
  return payment.confirmedAt ?? payment.submittedAt ?? payment.updatedAt ?? payment.createdAt;
}

function summarizeBookings(bookings: Booking[], payments: Payment[]) {
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const paymentsByBooking = new Map(payments.filter((payment) => bookingIds.has(payment.bookingId)).map((payment) => [payment.bookingId, payment]));

  return bookings.reduce(
    (summary, booking) => {
      const receivedAmount = paymentReceivedAmount(booking, paymentsByBooking.get(booking.id));
      const stayprimeMarkup = receivedAmount > 0 ? calculateStayprimeMarkupFromTotal(receivedAmount) : 0;
      const hostPayout = receivedAmount > 0 ? calculateHostPayoutFromTotal(receivedAmount) : 0;

      return {
        bookingValue: booking.status === "cancelled" ? summary.bookingValue : summary.bookingValue + booking.totalPrice,
        receivedGuestPayments: summary.receivedGuestPayments + receivedAmount,
        stayprimeMarkupEarnings: summary.stayprimeMarkupEarnings + stayprimeMarkup,
        hostPayouts: summary.hostPayouts + hostPayout,
      };
    },
    {
      bookingValue: 0,
      receivedGuestPayments: 0,
      stayprimeMarkupEarnings: 0,
      hostPayouts: 0,
    },
  );
}

function ledgerTotalForBookings(ledger: PlatformLedgerEntry[], bookings: Booking[]) {
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  return ledger.filter((entry) => bookingIds.has(entry.bookingId)).reduce((sum, entry) => sum + entry.amount, 0);
}

export default async function AdminErpPage({ searchParams }: { searchParams: Promise<{ host?: string }> }) {
  const [query, users, bookings, payments, properties, ledger] = await Promise.all([
    searchParams,
    getUsers(),
    getBookings(),
    getAdminPayments(),
    getProperties(),
    getPlatformLedger(),
  ]);

  const hosts = users.filter((user) => user.role === "host");
  const guests = users.filter((user) => user.role === "guest");
  const usersById = new Map(users.map((user) => [user.id, user]));
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));

  const selectedHostId = query.host && hosts.some((host) => host.id === query.host) ? query.host : null;
  const selectedHost = selectedHostId ? usersById.get(selectedHostId) : null;

  const scopedBookings = selectedHostId ? bookings.filter((booking) => booking.hostId === selectedHostId) : bookings;
  const scopedPayments = selectedHostId ? payments.filter((payment) => payment.hostId === selectedHostId) : payments;

  const scopedSummary = summarizeBookings(scopedBookings, scopedPayments);
  const bankedStayprimeEarnings = selectedHostId
    ? ledgerTotalForBookings(ledger, scopedBookings)
    : ledger.reduce((sum, entry) => sum + entry.amount, 0);
  const fullyPaidBookings = scopedBookings.filter((booking) => isFullyPaid(booking.paymentStatus)).length;
  const partiallyPaidBookings = scopedBookings.filter((booking) => booking.paymentStatus === "partially_paid").length;
  const submittedPayments = scopedPayments.filter((payment) => payment.paymentStatus === "submitted").length;

  const hostRows = hosts
    .map((host) => {
      const hostBookings = bookings.filter((booking) => booking.hostId === host.id);
      const hostSummary = summarizeBookings(hostBookings, payments);
      return {
        host,
        listings: properties.filter((property) => property.hostId === host.id).length,
        bookings: hostBookings.length,
        guestPayments: hostSummary.receivedGuestPayments,
        stayprimeMarkup: hostSummary.stayprimeMarkupEarnings,
        hostPayouts: hostSummary.hostPayouts,
      };
    })
    .sort((a, b) => b.stayprimeMarkup - a.stayprimeMarkup || b.guestPayments - a.guestPayments);

  const guestRows = guests
    .map((guest) => {
      const guestBookings = scopedBookings.filter((booking) => booking.guestId === guest.id);
      const guestSummary = summarizeBookings(guestBookings, scopedPayments);
      return { guest, bookings: guestBookings.length, spent: guestSummary.receivedGuestPayments };
    })
    .sort((a, b) => b.spent - a.spent);
  const visibleGuestRows = guestRows.filter((row) => row.bookings > 0);

  const transactions = [...scopedPayments]
    .sort((a, b) => new Date(paymentTimestamp(b)).getTime() - new Date(paymentTimestamp(a)).getTime())
    .slice(0, 30);

  return (
    <DashboardShell
      title="Admin ERP"
      subtitle="Admin dashboard"
      description="Platform-wide hosts, guests, and transactions. Filter by host to drill into their activity."
      links={adminLinks}
    >
      {/* Host filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/erp"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedHostId ? "border border-black/15 text-black/70 hover:bg-black/[0.04]" : "bg-black text-white"}`}
        >
          All hosts
        </Link>
        {hosts.map((host) => (
          <Link
            key={host.id}
            href={`/admin/erp?host=${encodeURIComponent(host.id)}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedHostId === host.id ? "bg-black text-white" : "border border-black/15 text-black/70 hover:bg-black/[0.04]"}`}
          >
            {host.name}
          </Link>
        ))}
      </div>

      {selectedHost ? (
        <p className="mb-4 text-sm text-black/55">
          Showing activity for <span className="font-semibold text-black">{selectedHost.name}</span> ({selectedHost.email}).
        </p>
      ) : null}

      <section className="mb-8">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Earnings overview</p>
          <h2 className="mt-1 text-2xl font-bold">StayPrimePH earnings from the {stayprimeMarkupLabel} markup</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            The markup is {stayprimeMarkupLabel} of the host price. For example, when a host price is PHP 10,000, the guest pays PHP 12,000, StayPrimePH earns PHP 2,000, and the host payout is PHP 10,000.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="Total StayPrimePH earnings"
            value={formatCurrency(scopedSummary.stayprimeMarkupEarnings)}
            description={`${stayprimeMarkupLabel} markup split from verified paid or partially paid guest payments.`}
          />
          <StatsCard
            label="Guest payments received"
            value={formatCurrency(scopedSummary.receivedGuestPayments)}
            description={`${fullyPaidBookings} paid booking${fullyPaidBookings === 1 ? "" : "s"} / ${partiallyPaidBookings} partial payment${partiallyPaidBookings === 1 ? "" : "s"}.`}
          />
          <StatsCard
            label="Host payout share"
            value={formatCurrency(scopedSummary.hostPayouts)}
            description="The remaining share after the StayPrimePH markup."
          />
          <StatsCard
            label="Banked markup ledger"
            value={formatCurrency(bankedStayprimeEarnings)}
            description="StayPrimePH markup already recorded in the platform ledger."
          />
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label={selectedHostId ? "Host bookings" : "Hosts"} value={selectedHostId ? String(scopedBookings.length) : String(hosts.length)} />
        <StatsCard label={selectedHostId ? "Paid bookings" : "Guests"} value={selectedHostId ? String(fullyPaidBookings) : String(guests.length)} />
        <StatsCard label="Total booking value" value={formatCurrency(scopedSummary.bookingValue)} description="All non-cancelled booking totals in this view." />
        <StatsCard label="Payments in review" value={String(submittedPayments)} description="Submitted payments awaiting verification." />
      </div>

      {!selectedHostId ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Hosts</h2>
          {hostRows.length === 0 ? (
            <EmptyState title="No hosts yet" body="Hosts will appear here once they sign up." />
          ) : (
            <DataTable
              headers={["Host", "Listings", "Bookings", "Guest payments", `StayPrimePH ${stayprimeMarkupLabel}`, "Host payout", ""]}
              rows={hostRows.map((row) => [
                <span key={`${row.host.id}-name`}><span className="font-semibold">{row.host.name}</span><br /><span className="text-xs text-black/45">{row.host.email}</span></span>,
                String(row.listings),
                String(row.bookings),
                formatCurrency(row.guestPayments),
                <span key={`${row.host.id}-markup`} className="font-semibold text-[#083f35]">{formatCurrency(row.stayprimeMarkup)}</span>,
                formatCurrency(row.hostPayouts),
                <Link key={`${row.host.id}-view`} href={`/admin/erp?host=${encodeURIComponent(row.host.id)}`} className="rounded-full bg-[#083f35] px-3 py-1.5 text-xs font-semibold text-white">View</Link>,
              ])}
            />
          )}
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{selectedHostId ? "Guests who booked this host" : "Guests"}</h2>
        {visibleGuestRows.length === 0 ? (
          <EmptyState title="No guest bookings yet" body="Guests will appear here once a booking has been created." />
        ) : (
          <DataTable
            headers={["Guest", "Bookings", "Total spent"]}
            rows={visibleGuestRows.map((row) => [
              <span key={`${row.guest.id}-name`}><span className="font-semibold">{row.guest.name}</span><br /><span className="text-xs text-black/45">{row.guest.email}</span></span>,
              String(row.bookings),
              formatCurrency(row.spent),
            ])}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Transactions</h2>
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" body="Payments will appear here once guests start paying." />
        ) : (
          <DataTable
            headers={["Date", "Guest", "Listing", "Payment amount", `StayPrimePH ${stayprimeMarkupLabel}`, "Host payout", "Method", "Status"]}
            rows={transactions.map((payment) => {
              const booking = bookingById.get(payment.bookingId);
              const property = booking ? propertyById.get(booking.propertyId) : undefined;
              const guest = payment.guestId ? usersById.get(payment.guestId) : undefined;
              const verified = isVerifiedPaymentStatus(payment.paymentStatus);
              const stayprimeMarkup = verified ? calculateStayprimeMarkupFromTotal(payment.amount) : null;
              const hostPayout = verified ? calculateHostPayoutFromTotal(payment.amount) : null;
              return [
                formatDate(paymentTimestamp(payment)),
                guest?.name ?? "Guest",
                property?.title ?? payment.bookingId,
                formatCurrency(payment.amount),
                stayprimeMarkup === null ? "-" : <span key={`${payment.id}-markup`} className="font-semibold text-[#083f35]">{formatCurrency(stayprimeMarkup)}</span>,
                hostPayout === null ? "-" : formatCurrency(hostPayout),
                formatPaymentMethod(payment.paymentMethod),
                <StatusBadge key={`${payment.id}-status`} status={payment.paymentStatus} />,
              ];
            })}
          />
        )}
      </section>
    </DashboardShell>
  );
}
