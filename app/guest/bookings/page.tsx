import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { guestLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { canReviewBooking, getReviews } from "@/lib/reviews";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

export default async function GuestBookingsPage() {
  const guest = await getCurrentUser();
  const [bookings, properties, reviews] = await Promise.all([getBookings(), getProperties(), getReviews()]);
  const guestBookings = bookings.filter((booking) => booking.guestId === guest?.id);

  return (
    <DashboardShell title="My Bookings" subtitle="Guest dashboard" description="Track pending, upcoming, completed, and cancelled trips." links={guestLinks}>
      {guestBookings.length === 0 ? (
        <EmptyState title="No bookings yet" body="Your reservations will appear here after you book a stay." />
      ) : (
        <DataTable
          headers={["Property", "Dates", "Guests", "Total", "Status", "Details"]}
          rows={guestBookings.map((booking) => {
            const property = properties.find((item) => item.id === booking.propertyId);
            const reviewed = reviews.some((review) =>
              review.bookingId === booking.id ||
              (review.propertyId === booking.propertyId && review.guestId === booking.guestId)
            );
            return [
              property?.title ?? "Property",
              <div key={`${booking.id}-dates`} className="min-w-48">
                <p>{formatStayDateRange(booking.checkIn, booking.checkOut)}</p>
                <p className="mt-1 text-xs text-black/50">{formatStayTimeRange()}</p>
              </div>,
              booking.guests,
              formatCurrency(booking.totalPrice),
              <div key={`${booking.id}-status`} className="flex flex-wrap gap-2">
                <StatusBadge status={booking.status} />
                <StatusBadge status={booking.paymentStatus} />
              </div>,
              <Link key={`${booking.id}-link`} href={`/guest/bookings/${booking.id}`} className="font-semibold text-[#d85d32]">
                {canReviewBooking(booking) && !reviewed ? "Leave review" : "View"}
              </Link>,
            ];
          })}
        />
      )}
    </DashboardShell>
  );
}
