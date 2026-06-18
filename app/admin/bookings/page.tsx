import { approveCancellationRefund, closeCancellationWithoutRefund } from "@/app/admin/bookings/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCancellations } from "@/lib/cancellations";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { adminLinks } from "@/lib/navigation";
import { getBookings } from "@/lib/bookings";
import { getProperties } from "@/lib/properties";
import { formatCurrency } from "@/lib/utils";

export default async function AdminBookingsPage() {
  const [bookings, properties, cancellations, csrfToken] = await Promise.all([
    getBookings(),
    getProperties(),
    getCancellations(),
    getCsrfToken(),
  ]);
  const cancellationByBooking = new Map(cancellations.map((cancellation) => [cancellation.bookingId, cancellation]));

  return (
    <DashboardShell title="Bookings" subtitle="Admin dashboard" links={adminLinks}>
      <DataTable
        headers={["Property", "Guests", "Total", "Status", "Cancellation", "Actions"]}
        rows={bookings.map((booking) => {
          const cancellation = cancellationByBooking.get(booking.id);
          return [
            properties.find((property) => property.id === booking.propertyId)?.title ?? "Property",
            booking.guests,
            formatCurrency(booking.totalPrice),
            <div key={`${booking.id}-status`} className="flex flex-wrap gap-2">
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.paymentStatus} />
            </div>,
            cancellation ? (
              <div key={`${booking.id}-cancellation`} className="grid gap-1">
                <StatusBadge status={cancellation.status} />
                <span className="max-w-64 text-xs text-black/55">{cancellation.reason ?? "No reason provided."}</span>
              </div>
            ) : (
              <span key={`${booking.id}-no-cancellation`} className="text-sm text-black/45">No cancellation</span>
            ),
            cancellation?.status === "review" ? (
              <div key={`${booking.id}-actions`} className="flex min-w-44 flex-col gap-2">
                <form action={approveCancellationRefund}>
                  <input type="hidden" name={csrfFieldName} value={csrfToken} />
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button className="min-h-10 w-full rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
                    Approve refund
                  </button>
                </form>
                <form action={closeCancellationWithoutRefund}>
                  <input type="hidden" name={csrfFieldName} value={csrfToken} />
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button className="min-h-10 w-full rounded-full bg-black/5 px-3 text-xs font-semibold text-black/65">
                    Close no refund
                  </button>
                </form>
              </div>
            ) : (
              <span key={`${booking.id}-no-actions`} className="text-sm text-black/45">No action</span>
            ),
          ];
        })}
      />
    </DashboardShell>
  );
}
