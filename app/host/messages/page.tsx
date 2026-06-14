import { Send } from "lucide-react";
import { sendGuestMessage } from "@/app/host/messages/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageAutoRefresh } from "@/components/ui/message-auto-refresh";
import { MessageThread } from "@/components/ui/message-thread";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getMessagesForUser } from "@/lib/messages";
import { hostLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";

type HostMessagesSearchParams = {
  guestId?: string;
  propertyId?: string;
  bookingId?: string;
  error?: string;
};

export default async function HostMessagesPage({
  searchParams,
}: {
  searchParams: Promise<HostMessagesSearchParams>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const [messages, bookings, properties, users] = await Promise.all([
    user ? getMessagesForUser(user.id) : [],
    getBookings(),
    getProperties(),
    getUsers(),
  ]);
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const selectedBooking = query.bookingId ? bookingsById.get(query.bookingId) : null;
  const selectedProperty = query.propertyId ? properties.find((item) => item.id === query.propertyId) : null;
  const scopedMessages =
    query.guestId || selectedProperty || selectedBooking
      ? messages.filter((message) => {
          const booking = message.bookingId ? bookingsById.get(message.bookingId) : null;
          const messagePropertyId = message.propertyId ?? booking?.propertyId;
          const matchesGuest = query.guestId
            ? message.senderId === query.guestId || message.receiverId === query.guestId
            : true;
          const matchesProperty = selectedProperty ? messagePropertyId === selectedProperty.id : true;
          const matchesBooking = selectedBooking ? message.bookingId === selectedBooking.id : true;
          return matchesGuest && matchesProperty && matchesBooking;
        })
      : messages;
  const activeMessages = scopedMessages;
  const latestMessage = activeMessages.at(-1) ?? messages.at(-1);
  const latestBooking = latestMessage?.bookingId ? bookingsById.get(latestMessage.bookingId) : null;
  const booking = selectedBooking ?? latestBooking ?? null;
  const property =
    selectedProperty ??
    (latestMessage?.propertyId ? properties.find((item) => item.id === latestMessage.propertyId) : null) ??
    (booking ? properties.find((item) => item.id === booking.propertyId) : null);
  const guestId =
    query.guestId ??
    booking?.guestId ??
    (latestMessage
      ? [latestMessage.senderId, latestMessage.receiverId].find((id) => id !== user?.id)
      : undefined);
  const guest = guestId ? users.find((item) => item.id === guestId) : null;
  const canReply = Boolean(guest && (property || booking));

  return (
    <DashboardShell title="Messages" subtitle="Host dashboard" description="Guest conversations tied to booking requests." links={hostLinks}>
      <MessageAutoRefresh />
      {messages.length === 0 && !canReply ? (
        <EmptyState title="No messages yet" body="Guest questions and booking conversations will appear here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-[1.5rem] bg-white p-5 soft-card">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Active thread</p>
            <h2 className="mt-2 text-xl font-bold">{guest?.name ?? "Guest"}</h2>
            <p className="mt-2 text-sm text-black/55">{property?.title ?? "Booking conversation"}</p>
          </aside>
          <div className="space-y-4">
            {activeMessages.length ? (
              <MessageThread messages={activeMessages} currentUserId={user?.id} />
            ) : (
              <EmptyState title="No messages in this thread yet" body="Replies to guest questions and booking conversations will appear here." />
            )}

            {query.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{query.error}</p> : null}

            {canReply && guest ? (
              <form action={sendGuestMessage} className="rounded-[1.5rem] bg-white p-4 soft-card sm:p-5">
                <input type="hidden" name="guestId" value={guest.id} />
                <input type="hidden" name="propertyId" value={property?.id ?? ""} />
                <input type="hidden" name="bookingId" value={booking?.id ?? ""} />
                <label className="sr-only" htmlFor="host-message">Message</label>
                <textarea
                  id="host-message"
                  name="message"
                  rows={3}
                  required
                  className="min-h-28 w-full resize-y rounded-2xl border border-black/10 p-4 text-sm outline-none transition focus:border-[#083f35]"
                  placeholder={`Reply to ${guest.name}`}
                />
                <div className="mt-3 flex justify-end">
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]">
                    <Send size={16} /> Send reply
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
