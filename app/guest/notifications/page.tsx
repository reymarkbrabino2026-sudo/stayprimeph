import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { guestLinks } from "@/lib/navigation";

function notificationCopy(paymentStatus: string) {
  if (paymentStatus === "submitted") {
    return {
      title: "Payment waiting for platform verification",
      body: "StayPrimePH support is reviewing the recorded payment.",
    };
  }
  if (paymentStatus === "rejected") {
    return {
      title: "Payment needs attention",
      body: "Check the rejection reason and submit updated payment details.",
    };
  }
  return {
    title: "Payment pending",
    body: "Complete payment for your booking before your stay is confirmed.",
  };
}

export default async function GuestNotificationsPage() {
  const user = await getCurrentUser();
  const bookings = (await getBookings()).filter((booking) => booking.guestId === user?.id);
  const paymentUpdates = bookings.filter((booking) => booking.paymentStatus === "pending" || booking.paymentStatus === "submitted" || booking.paymentStatus === "rejected");

  return (
    <DashboardShell title="Notifications" subtitle="Guest dashboard" description="Important trip and payment updates." links={guestLinks}>
      {paymentUpdates.length === 0 ? (
        <EmptyState title="No notifications yet" body="You have a blank slate for now. We will let you know when updates arrive." />
      ) : (
        <div className="space-y-3">
          {paymentUpdates.map((booking) => {
            const copy = notificationCopy(booking.paymentStatus);

            return (
              <article key={booking.id} className="rounded-[1.5rem] bg-white p-5 soft-card">
                <p className="font-semibold">{copy.title}</p>
                <p className="mt-2 text-sm text-black/55">{copy.body}</p>
                <Link href={`/guest/bookings/${booking.id}`} className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                  View booking
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
