import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminLinks } from "@/lib/navigation";
import { getBookings } from "@/lib/bookings";
import { getProperties } from "@/lib/properties";
import { formatCurrency } from "@/lib/utils";

export default async function AdminBookingsPage() {
  const [bookings, properties] = await Promise.all([getBookings(), getProperties()]);

  return (
    <DashboardShell title="Bookings" subtitle="Admin dashboard" links={adminLinks}>
      <DataTable
        headers={["Property", "Guests", "Total", "Status"]}
        rows={bookings.map((booking) => [
          properties.find((property) => property.id === booking.propertyId)?.title ?? "Property",
          booking.guests,
          formatCurrency(booking.totalPrice),
          <div key={booking.id} className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} />
          </div>,
        ])}
      />
    </DashboardShell>
  );
}
