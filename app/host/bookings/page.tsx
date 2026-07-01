import { confirmPaymentAndApproveBooking, markCashBalancePaid, rejectBooking, rejectSubmittedPayment } from "@/app/host/bookings/actions";
import { BookingActionSubmitButton } from "@/app/host/bookings/booking-action-submit-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookingsForHost } from "@/lib/bookings";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { hostLinks } from "@/lib/navigation";
import { paidAvailabilityBlocksForProperties } from "@/lib/paid-availability-blocks";
import { formatPaymentMethod, getPaymentsForHost } from "@/lib/payments";
import { getPropertiesForHost } from "@/lib/properties";
import { getUsersByIds } from "@/lib/users";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

export default async function HostBookingsPage() {
  const user = await getCurrentUser();
  const hostId = user?.id ?? "";
  const [hostBookings, properties, payments, availabilityBlocks, csrfToken] = await Promise.all([
    hostId ? getBookingsForHost(hostId) : Promise.resolve([]),
    hostId ? getPropertiesForHost(hostId) : Promise.resolve([]),
    hostId ? getPaymentsForHost(hostId) : Promise.resolve([]),
    hostId ? getAvailabilityBlocks() : Promise.resolve([]),
    getCsrfToken(),
  ]);
  const users = await getUsersByIds(hostBookings.map((booking) => booking.guestId));
  const paidBlocks = paidAvailabilityBlocksForProperties(availabilityBlocks, properties);

  return (
    <DashboardShell title="Booking Requests" subtitle="Host dashboard" links={hostLinks}>
      <DataTable
        headers={["Guest", "Property", "Dates", "Payment", "Status", "Actions"]}
        rows={[...hostBookings.map((booking) => {
          const payment = payments.find((item) => item.bookingId === booking.id);
          const paymentWaiting = payment?.paymentStatus === "submitted";
          const balanceWaiting = booking.paymentStatus === "partially_paid" && payment?.paymentStatus === "partially_paid";
          const isPartialPayment = Boolean(payment && payment.amount < booking.totalPrice);
          const remainingBalance = payment ? Math.max(booking.totalPrice - payment.amount, 0) : 0;
          const submittedPaymentLabel = isPartialPayment ? "Guest submitted partial payment" : "Guest submitted payment";
          const confirmPaymentLabel = isPartialPayment ? "Partially paid & confirm" : "Confirm payment & approve";
          const confirmPaymentPendingLabel = isPartialPayment ? "Confirming partial..." : "Approving...";

          return [
            users.find((item) => item.id === booking.guestId)?.name ?? "Guest",
            properties.find((property) => property.id === booking.propertyId)?.title ?? "Property",
            <div key={`${booking.id}-dates`} className="min-w-48">
              {booking.bookingPackageName ? <p className="font-semibold">{booking.bookingPackageName}</p> : null}
              <p>{formatStayDateRange(booking.checkIn, booking.checkOut)}</p>
              <p className="mt-1 text-xs text-black/50">{formatStayTimeRange()}</p>
            </div>,
            payment ? (
              <div key={`${booking.id}-payment`} className="min-w-48 space-y-1 text-sm">
                <p className="font-semibold">{formatCurrency(payment.amount)} via {formatPaymentMethod(payment.paymentMethod)}</p>
                {isPartialPayment ? <p className="font-semibold text-amber-700">Balance due: {formatCurrency(remainingBalance)}</p> : null}
                <p className="break-words text-black/55">Ref: {payment.transactionId}</p>
                {payment.receiptImageUrl ? (
                  <a
                    href={payment.receiptImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-xs font-semibold text-[#d85d32]"
                  >
                    View receipt
                  </a>
                ) : null}
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
                <div className="space-y-2">
                  <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    {submittedPaymentLabel}
                  </p>
                  <form action={confirmPaymentAndApproveBooking}>
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="id" value={booking.id} />
                    <BookingActionSubmitButton
                      label={confirmPaymentLabel}
                      pendingLabel={confirmPaymentPendingLabel}
                      className="min-h-10 w-full rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700 transition disabled:cursor-wait disabled:bg-emerald-50 disabled:text-emerald-700/60"
                    />
                  </form>
                  <form action={rejectSubmittedPayment} className="space-y-2">
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="id" value={booking.id} />
                    <input
                      name="rejectionReason"
                      placeholder="Reason if payment is invalid"
                      className="min-h-10 w-full rounded-xl border px-3 text-xs"
                      required
                    />
                    <BookingActionSubmitButton
                      label="Reject payment"
                      pendingLabel="Rejecting..."
                      className="min-h-10 w-full rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-wait disabled:bg-rose-50 disabled:text-rose-700/60"
                    />
                  </form>
                </div>
              ) : balanceWaiting ? (
                <div className="space-y-2">
                  <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    Partially paid
                  </p>
                  <p className="text-xs font-semibold text-black/55">
                    Balance due: {formatCurrency(remainingBalance)}
                  </p>
                  <form action={markCashBalancePaid}>
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="id" value={booking.id} />
                    <BookingActionSubmitButton
                      label="Balance paid in cash"
                      pendingLabel="Marking paid..."
                      className="min-h-10 w-full rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700 transition disabled:cursor-wait disabled:bg-emerald-50 disabled:text-emerald-700/60"
                    />
                  </form>
                </div>
              ) : booking.status === "confirmed" ? (
                <span className="text-sm font-semibold text-emerald-700">Approved</span>
              ) : booking.status === "cancelled" ? (
                <span className="text-sm font-semibold text-rose-700">Cancelled</span>
              ) : (
                <>
                  <span className="text-sm text-black/55">Waiting for guest payment</span>
                  <form action={rejectBooking}>
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="id" value={booking.id} />
                    <BookingActionSubmitButton
                      label="Reject booking"
                      pendingLabel="Rejecting..."
                      className="min-h-10 w-full rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-wait disabled:bg-rose-50 disabled:text-rose-700/60"
                    />
                  </form>
                </>
              )}
            </div>,
          ];
        }), ...paidBlocks.map((block) => [
          "External guest",
          block.propertyTitle,
          <div key={`${block.id}-dates`} className="min-w-48">
            {block.bookingPackageName ? <p className="font-semibold">{block.bookingPackageName}</p> : null}
            <p>{formatStayDateRange(block.checkIn, block.checkOut)}</p>
            <p className="mt-1 text-xs text-black/50">{block.reasonLabel}</p>
          </div>,
          <div key={`${block.id}-payment`} className="min-w-48 space-y-1 text-sm">
            <p className="font-semibold">{formatCurrency(block.totalPrice)}</p>
            <p className="text-black/55">Paid outside StayPrimePH</p>
          </div>,
          <div key={`${block.id}-status`} className="flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{block.reasonLabel}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Paid</span>
          </div>,
          <span key={`${block.id}-actions`} className="text-sm font-semibold text-black/45">No action needed</span>,
        ])]}
      />
    </DashboardShell>
  );
}
