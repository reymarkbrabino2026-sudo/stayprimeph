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
import { calculateHostPayoutFromTotal, calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";
import { formatCurrency, formatDate } from "@/lib/utils";

function isPaid(paymentStatus: string) {
  return paymentStatus === "paid" || paymentStatus === "partially_paid";
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

  const paidScoped = scopedBookings.filter((booking) => isPaid(booking.paymentStatus));
  const grossSales = paidScoped.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const platformRevenue = selectedHostId
    ? paidScoped.reduce((sum, booking) => sum + calculateStayprimeMarkupFromTotal(booking.totalPrice), 0)
    : ledger.reduce((sum, entry) => sum + entry.amount, 0);
  const hostPayouts = paidScoped.reduce((sum, booking) => sum + calculateHostPayoutFromTotal(booking.totalPrice), 0);

  const hostRows = hosts
    .map((host) => {
      const hostBookings = bookings.filter((booking) => booking.hostId === host.id);
      const sales = hostBookings.filter((booking) => isPaid(booking.paymentStatus)).reduce((sum, booking) => sum + booking.totalPrice, 0);
      return {
        host,
        listings: properties.filter((property) => property.hostId === host.id).length,
        bookings: hostBookings.length,
        sales,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const guestRows = guests
    .map((guest) => {
      const guestBookings = bookings.filter((booking) => booking.guestId === guest.id);
      const spent = guestBookings.filter((booking) => isPaid(booking.paymentStatus)).reduce((sum, booking) => sum + booking.totalPrice, 0);
      return { guest, bookings: guestBookings.length, spent };
    })
    .sort((a, b) => b.spent - a.spent);

  const transactions = [...scopedPayments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label={selectedHostId ? "Host bookings" : "Hosts"} value={selectedHostId ? String(scopedBookings.length) : String(hosts.length)} />
        <StatsCard label={selectedHostId ? "Paid bookings" : "Guests"} value={selectedHostId ? String(paidScoped.length) : String(guests.length)} />
        <StatsCard label="Gross sales" value={formatCurrency(grossSales)} description="Paid + partially paid" />
        <StatsCard label={selectedHostId ? "Host payout" : "Platform revenue"} value={formatCurrency(selectedHostId ? hostPayouts : platformRevenue)} />
      </div>

      {!selectedHostId ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Hosts</h2>
          {hostRows.length === 0 ? (
            <EmptyState title="No hosts yet" body="Hosts will appear here once they sign up." />
          ) : (
            <DataTable
              headers={["Host", "Listings", "Bookings", "Sales", ""]}
              rows={hostRows.map((row) => [
                <span key={`${row.host.id}-name`}><span className="font-semibold">{row.host.name}</span><br /><span className="text-xs text-black/45">{row.host.email}</span></span>,
                String(row.listings),
                String(row.bookings),
                formatCurrency(row.sales),
                <Link key={`${row.host.id}-view`} href={`/admin/erp?host=${encodeURIComponent(row.host.id)}`} className="rounded-full bg-[#083f35] px-3 py-1.5 text-xs font-semibold text-white">View</Link>,
              ])}
            />
          )}
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{selectedHostId ? "Guests who booked this host" : "Guests"}</h2>
        {guestRows.length === 0 ? (
          <EmptyState title="No guests yet" body="Guests will appear here once they sign up." />
        ) : (
          <DataTable
            headers={["Guest", "Bookings", "Total spent"]}
            rows={guestRows
              .filter((row) => (selectedHostId ? scopedBookings.some((booking) => booking.guestId === row.guest.id) : true))
              .map((row) => [
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
            headers={["Date", "Guest", "Listing", "Amount", "Method", "Status"]}
            rows={transactions.map((payment) => {
              const booking = bookingById.get(payment.bookingId);
              const property = booking ? propertyById.get(booking.propertyId) : undefined;
              const guest = payment.guestId ? usersById.get(payment.guestId) : undefined;
              return [
                formatDate(payment.createdAt),
                guest?.name ?? "Guest",
                property?.title ?? payment.bookingId,
                formatCurrency(payment.amount),
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
