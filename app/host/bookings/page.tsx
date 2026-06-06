import { confirmPaymentAndApproveBooking, rejectBooking, rejectSubmittedPayment } from "@/app/host/bookings/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { hostLinks } from "@/lib/navigation";
import { formatPaymentMethod, getPayments } from "@/lib/payments";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function HostBookingsPage() {
  const user = await getCurrentUser();
  const [bookings, properties, users, payments] = await Promise.all([getBookings(), getProperties(), getUsers(), getPayments()]);
  const hostBookings = bookings.filter((booking) => booking.hostId === user?.id);

  return (
    <DashboardShell title="Booking Requests" subtitle="Host dashboard" links={hostLinks}>
      <DataTable
        headers={["Guest", "Property", "Dates", "Payment", "Status", "Actions"]}
        rows={hostBookings.map((booking) => {
          const payment = payments.find((item) => item.bookingId === booking.id);
          const paymentWaiting = payment?.paymentStatus === "submitted";

          return [
            users.find((item) => item.id === booking.guestId)?.name ?? "Guest",
            properties.find((property) => property.id === booking.propertyId)?.title ?? "Property",
            `${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`,
            payment ? (
              <div key={`${booking.id}-payment`} className="min-w-48 space-y-1 text-sm">
                <p className="font-semibold">{formatCurrency(payment.amount)} via {formatPaymentMethod(payment.paymentMethod)}</p>
                <p className="break-words text-black/55">Ref: {payment.transactionId}</p>
                {payment.notes ? <p className="line-clamp-2 text-black/55">{payment.notes}</p> : null}
                {payment.rejectionReason ? <p className="text-rose-700">Rejected: {payment.rejectionReason}</p> : null}
              </div>
            ) : (
              <span key={`${booking.id}-no-payment`} className="text-sm text-black/45">No payment submitted</span>
            ),
            <div key={`${booking.id}-status`} className="flex flex-wrap gap-2">
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.paymentStatus} />
            </div>,
            <div key={`${booking.id}-actions`} className="flex min-w-56 flex-col gap-2">
              {paymentWaiting ? (
                <>
                  <form action={confirmPaymentAndApproveBooking}>
                    <input type="hidden" name="id" value={booking.id} />
                    <button className="min-h-10 w-full rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
                      Confirm payment and approve booking
                    </button>
                  </form>
                  <form action={rejectSubmittedPayment} className="space-y-2">
                    <input type="hidden" name="id" value={booking.id} />
                    <input
                      name="rejectionReason"
                      placeholder="Reason for rejection"
                      className="min-h-10 w-full rounded-xl border px-3 text-xs"
                      required
                    />
                    <button className="min-h-10 w-full rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700">
                      Reject payment
                    </button>
                  </form>
                </>
              ) : booking.status === "confirmed" ? (
                <span className="text-sm font-semibold text-emerald-700">Approved</span>
              ) : booking.status === "cancelled" ? (
                <span className="text-sm font-semibold text-rose-700">Cancelled</span>
              ) : (
                <>
                  <span className="text-sm text-black/55">Waiting for guest payment</span>
                  <form action={rejectBooking}>
                    <input type="hidden" name="id" value={booking.id} />
                    <button className="min-h-10 w-full rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700">
                      Reject booking
                    </button>
                  </form>
                </>
              )}
            </div>,
          ];
        })}
      />
    </DashboardShell>
  );
}
