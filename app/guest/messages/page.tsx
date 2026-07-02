import { Send } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { sendHostMessage } from "@/app/guest/messages/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageAutoRefresh } from "@/components/ui/message-auto-refresh";
import { MessageThread } from "@/components/ui/message-thread";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { getMessagesForUser } from "@/lib/messages";
import { guestLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";

type GuestMessagesSearchParams = {
  propertyId?: string;
  hostId?: string;
  error?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GuestMessagesPage({
  searchParams,
}: {
  searchParams: Promise<GuestMessagesSearchParams>;
}) {
  noStore();
  const query = await searchParams;
  const user = await getCurrentUser();
  const [allMessages, bookings, properties, users, csrfToken] = await Promise.all([
    user ? getMessagesForUser(user.id) : [],
    getBookings(),
    getProperties(),
    getUsers(),
    getCsrfToken(),
  ]);
  const messages = allMessages.filter((message) => message.bookingId || message.propertyId);
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const selectedProperty = query.propertyId ? properties.find((item) => item.id === query.propertyId) : null;
  const selectedHostId = query.hostId ?? selectedProperty?.hostId;
  const scopedMessages =
    selectedHostId || selectedProperty
      ? messages.filter((message) => {
          const booking = message.bookingId ? bookingsById.get(message.bookingId) : null;
          const messagePropertyId = message.propertyId ?? booking?.propertyId;
          const matchesHost = selectedHostId
            ? message.senderId === selectedHostId || message.receiverId === selectedHostId
            : true;
          const matchesProperty = selectedProperty ? messagePropertyId === selectedProperty.id : true;
          return matchesHost && matchesProperty;
        })
      : messages;
  const activeMessages = scopedMessages;
  const latestMessage = activeMessages.at(-1) ?? messages.at(-1);
  const latestBooking = latestMessage?.bookingId ? bookingsById.get(latestMessage.bookingId) : null;
  const property =
    selectedProperty ??
    (latestMessage?.propertyId ? properties.find((item) => item.id === latestMessage.propertyId) : null) ??
    (latestBooking ? properties.find((item) => item.id === latestBooking.propertyId) : null);
  const hostId =
    selectedHostId ??
    property?.hostId ??
    latestBooking?.hostId ??
    (latestMessage
      ? [latestMessage.senderId, latestMessage.receiverId].find((id) => id !== user?.id)
      : undefined);
  const host = hostId ? users.find((item) => item.id === hostId) : null;
  const canCompose = Boolean(property && host);

  return (
    <DashboardShell title="Messages" subtitle="Guest dashboard" description="Conversations with hosts about your stays." links={guestLinks}>
      <MessageAutoRefresh />
      {messages.length === 0 && !canCompose ? (
        <EmptyState title="No messages yet" body="Host conversations will appear here once you ask a question or make a booking." />
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[320px_1fr] lg:gap-6">
          <aside className="min-w-0 rounded-[1.5rem] bg-white p-5 soft-card">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Active thread</p>
            <h2 className="mt-2 break-words text-xl font-bold">{host?.name ?? "Host"}</h2>
            <p className="mt-2 break-words text-sm text-black/55">{property?.title ?? "Booking conversation"}</p>
          </aside>
          <div className="min-w-0 space-y-4">
            {activeMessages.length ? (
              <MessageThread messages={activeMessages} currentUserId={user?.id} />
            ) : (
              <EmptyState title={`Start a conversation with ${host?.name ?? "the host"}`} body="Ask about availability, house rules, or anything you want clarified before booking." />
            )}

            {query.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{query.error}</p> : null}

            {canCompose && property ? (
              <form action={sendHostMessage} className="rounded-[1.5rem] bg-white p-4 soft-card sm:p-5">
                <input type="hidden" name={csrfFieldName} value={csrfToken} />
                <input type="hidden" name="propertyId" value={property.id} />
                <label className="sr-only" htmlFor="guest-message">Message</label>
                <textarea
                  id="guest-message"
                  name="message"
                  rows={3}
                  required
                  className="min-h-28 w-full resize-y rounded-2xl border border-black/10 p-4 text-sm outline-none transition focus:border-[#083f35]"
                  placeholder={activeMessages.length ? `Reply to ${host?.name ?? "the host"}` : `Ask ${host?.name ?? "the host"} a question`}
                />
                <div className="mt-3 flex justify-end">
                  <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28] sm:w-auto">
                    <Send size={16} /> Send message
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
