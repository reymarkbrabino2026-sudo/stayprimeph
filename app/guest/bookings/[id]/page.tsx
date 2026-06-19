import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BookingCancellationForm } from "@/components/bookings/booking-cancellation-form";
import { PayNowButton } from "@/components/bookings/pay-now-button";
import { StayReviewForm } from "@/components/reviews/stay-review-form";
import { ReviewCard } from "@/components/ui/review-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { getCsrfToken } from "@/lib/csrf";
import { guestLinks } from "@/lib/navigation";
import { getPaymentByBookingId } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { canReviewBooking, getReviewForBooking } from "@/lib/reviews";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

export default async function BookingDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancel?: string; payment?: string; review?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [booking, user, csrfToken] = await Promise.all([getBookingById(id), getCurrentUser(), getCsrfToken()]);
  const [property, payment] = booking
    ? await Promise.all([getPropertyById(booking.propertyId), getPaymentByBookingId(booking.id)])
    : [null, null];

  if (!booking || !property || booking.guestId !== user?.id) notFound();
  const existingReview = await getReviewForBooking(booking);
  const reviewEligible = canReviewBooking(booking);
  const checkInDate = new Date(`${booking.checkIn}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canCancelBooking =
    (booking.status === "pending" || booking.status === "confirmed") &&
    checkInDate.getTime() > today.getTime();
  const cancellationRequiresReview = booking.paymentStatus === "paid" || booking.paymentStatus === "submitted";

  const messageHostHref = `/guest/messages?propertyId=${encodeURIComponent(property.id)}&hostId=${encodeURIComponent(booking.hostId)}`;

  return (
    <DashboardShell title="Booking Details" subtitle="Guest dashboard" links={guestLinks}>
      <div className="rounded-[1.5rem] bg-white p-6 soft-card">
        {query.payment === "processing" && booking.paymentStatus !== "paid" ? (
          <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            Payment is processing. This booking will show as paid only after provider webhook confirmation.
          </p>
        ) : null}
        {query.payment === "manual-submitted" ? (
          <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
            Payment details submitted. StayPrimePH will review the reference before this booking is marked as paid.
          </p>
        ) : null}
        {query.review === "posted" ? (
          <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
            Thanks for reviewing your stay. Your note is now shown on the listing and host reviews.
          </p>
        ) : null}
        {query.cancel === "success" ? (
          <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
            Booking cancelled. The host can see the update, and support will review any submitted or paid payment.
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">{property.title}</h2>
            <p className="text-black/55">{formatPropertyLocation(property)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Link
              href={messageHostHref}
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28]"
            >
              <MessageCircle size={16} /> Message host
            </Link>
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {booking.bookingPackageName ? (
            <div>
              <p className="text-sm text-black/45">Package</p>
              <p>{booking.bookingPackageName}</p>
              <p className="mt-1 text-sm text-black/55">Counts by {booking.bookingPackageUnit === "day" ? "day" : "night"}</p>
            </div>
          ) : null}
          <div>
            <p className="text-sm text-black/45">Dates</p>
            <p>{formatStayDateRange(booking.checkIn, booking.checkOut)}</p>
            <p className="mt-1 text-sm text-black/55">{formatStayTimeRange()}</p>
          </div>
          <div>
            <p className="text-sm text-black/45">Guests</p>
            <p>{booking.guests}</p>
          </div>
          <div>
            <p className="text-sm text-black/45">Total</p>
            <p>{formatCurrency(booking.totalPrice)}</p>
          </div>
        </div>
        {booking.status === "cancelled" ? (
          <p className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            This booking is cancelled. These dates are no longer reserved for your stay.
          </p>
        ) : booking.paymentStatus === "paid" ? (
          <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Payment confirmed. Your booking is approved.
          </p>
        ) : (
          <PayNowButton
            booking={booking}
            propertyTitle={property.title}
            propertyLocation={formatPropertyLocation(property)}
            payment={payment}
            csrfToken={csrfToken}
          />
        )}
        {canCancelBooking ? (
          <BookingCancellationForm
            bookingId={booking.id}
            propertyTitle={property.title}
            checkIn={booking.checkIn}
            checkOut={booking.checkOut}
            csrfToken={csrfToken}
            totalPrice={booking.totalPrice}
            requiresReview={cancellationRequiresReview}
          />
        ) : null}
      </div>
      {existingReview ? (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold">Your review</h2>
          <ReviewCard review={existingReview} />
        </section>
      ) : reviewEligible ? (
        <StayReviewForm bookingId={booking.id} csrfToken={csrfToken} />
      ) : booking.status === "cancelled" ? (
        <section className="mt-6 rounded-[1.5rem] border border-dashed bg-white p-5 text-sm leading-6 text-black/60">
          Cancelled bookings cannot be reviewed.
        </section>
      ) : (
        <section className="mt-6 rounded-[1.5rem] border border-dashed bg-white p-5 text-sm leading-6 text-black/60">
          Reviews open after a paid stay is completed. Once checkout has passed, you can share your real experience
          with the listing and host here.
        </section>
      )}
    </DashboardShell>
  );
}
