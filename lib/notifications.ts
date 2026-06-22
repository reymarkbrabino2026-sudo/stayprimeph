import "server-only";

import { getAuditLogs } from "@/lib/audit-logs";
import { getBookings } from "@/lib/bookings";
import { getMessages } from "@/lib/messages";
import { getPayments } from "@/lib/payments";
import { getProperties } from "@/lib/properties";
import { canReviewBooking, getReviews } from "@/lib/reviews";
import type { AuditLog, Booking, Message, Payment, Property, Review, User } from "@/lib/types";
import { getUsers } from "@/lib/users";

export type ActivityNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  category: "booking" | "message" | "payment" | "listing" | "support" | "security" | "activity";
};

function byNewest(a: ActivityNotification, b: ActivityNotification) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compact(value: string, maxLength = 96) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function userName(usersById: Map<string, User>, userId: string, fallback: string) {
  return usersById.get(userId)?.name ?? fallback;
}

function propertyTitle(propertiesById: Map<string, Property>, propertyId?: string) {
  return propertyId ? propertiesById.get(propertyId)?.title ?? "a listing" : "a listing";
}

function paymentEventTime(payment: Payment | undefined, booking: Booking) {
  return payment?.updatedAt ?? payment?.confirmedAt ?? payment?.rejectedAt ?? payment?.submittedAt ?? payment?.createdAt ?? booking.createdAt;
}

function bookingHrefForRole(role: User["role"], booking: Booking) {
  if (role === "host") return `/host/bookings?booking=${encodeURIComponent(booking.id)}`;
  if (role === "admin") return "/admin/bookings";
  return `/guest/bookings/${booking.id}`;
}

function messageHrefForRole(role: User["role"], message: Message) {
  if (!message.bookingId && !message.propertyId) return role === "admin" ? "/admin/support" : "/support/help-center";
  if (role === "host") {
    const params = new URLSearchParams();
    if (message.senderId) params.set("guestId", message.senderId);
    if (message.propertyId) params.set("propertyId", message.propertyId);
    if (message.bookingId) params.set("bookingId", message.bookingId);
    return `/host/messages?${params.toString()}`;
  }
  const params = new URLSearchParams();
  if (message.propertyId) params.set("propertyId", message.propertyId);
  if (message.senderId) params.set("hostId", message.senderId);
  const query = params.toString();
  return `/guest/messages${query ? `?${query}` : ""}`;
}

function addMessageNotifications({
  notifications,
  messages,
  user,
  usersById,
}: {
  notifications: ActivityNotification[];
  messages: Message[];
  user: User;
  usersById: Map<string, User>;
}) {
  for (const message of messages) {
    if (message.receiverId !== user.id) continue;
    const isSupport = !message.bookingId && !message.propertyId;
    const senderName = userName(usersById, message.senderId, isSupport ? "Support" : "Someone");
    notifications.push({
      id: `message:${message.id}`,
      title: isSupport ? "New support reply" : `New message from ${senderName}`,
      body: compact(message.message),
      href: messageHrefForRole(user.role, message),
      createdAt: message.createdAt,
      category: isSupport ? "support" : "message",
    });
  }
}

function addGuestBookingNotifications({
  notifications,
  bookings,
  paymentsByBookingId,
  propertiesById,
  hasReview,
  user,
}: {
  notifications: ActivityNotification[];
  bookings: Booking[];
  paymentsByBookingId: Map<string, Payment>;
  propertiesById: Map<string, Property>;
  hasReview: (booking: Booking) => boolean;
  user: User;
}) {
  for (const booking of bookings) {
    if (booking.guestId !== user.id) continue;
    const title = propertyTitle(propertiesById, booking.propertyId);
    const href = bookingHrefForRole("guest", booking);
    const payment = paymentsByBookingId.get(booking.id);

    if (booking.paymentStatus === "pending") {
      notifications.push({
        id: `booking-payment-pending:${booking.id}`,
        title: "Payment pending",
        body: `Complete payment for ${title} to keep your stay moving.`,
        href,
        createdAt: booking.createdAt,
        category: "payment",
      });
    }

    if (booking.paymentStatus === "submitted") {
      notifications.push({
        id: `booking-payment-submitted:${booking.id}`,
        title: "Payment waiting for review",
        body: `Your host is confirming the received payment for ${title}.`,
        href,
        createdAt: paymentEventTime(payment, booking),
        category: "payment",
      });
    }

    if (booking.paymentStatus === "rejected") {
      notifications.push({
        id: `booking-payment-rejected:${booking.id}`,
        title: "Payment needs attention",
        body: `Update your payment details for ${title}.`,
        href,
        createdAt: paymentEventTime(payment, booking),
        category: "payment",
      });
    }

    if (booking.paymentStatus === "paid" || booking.status === "confirmed") {
      notifications.push({
        id: `booking-confirmed:${booking.id}`,
        title: "Stay confirmed",
        body: `${title} is confirmed for your trip.`,
        href,
        createdAt: paymentEventTime(payment, booking),
        category: "booking",
      });
    }

    if (booking.status === "cancelled") {
      notifications.push({
        id: `booking-cancelled:${booking.id}`,
        title: "Booking cancelled",
        body: `${title} has been marked cancelled.`,
        href,
        createdAt: booking.createdAt,
        category: "booking",
      });
    }

    // Prompt for feedback once the stay is over and the guest hasn't reviewed yet.
    if (canReviewBooking(booking) && !hasReview(booking)) {
      notifications.push({
        id: `booking-review-request:${booking.id}`,
        title: "How was your stay?",
        body: `Share feedback on ${title} and your host to help future guests.`,
        href: `/guest/bookings/${booking.id}`,
        createdAt: `${booking.checkOut}T12:00:00`,
        category: "activity",
      });
    }
  }
}

function addHostNotifications({
  notifications,
  bookings,
  paymentsByBookingId,
  properties,
  propertiesById,
  user,
}: {
  notifications: ActivityNotification[];
  bookings: Booking[];
  paymentsByBookingId: Map<string, Payment>;
  properties: Property[];
  propertiesById: Map<string, Property>;
  reviews: Review[];
  usersById: Map<string, User>;
  user: User;
}) {
  for (const review of reviews) {
    const property = propertiesById.get(review.propertyId);
    if (!property || property.hostId !== user.id) continue;
    const guestName = usersById.get(review.guestId)?.name ?? "A guest";
    notifications.push({
      id: `host-review:${review.id}`,
      title: "New guest review",
      body: `${guestName} left a ${review.rating}-star review on ${property.title}.`,
      href: `/rooms/${review.propertyId}`,
      createdAt: review.createdAt,
      category: "activity",
    });
  }

  for (const booking of bookings) {
    if (booking.hostId !== user.id) continue;
    const title = propertyTitle(propertiesById, booking.propertyId);
    const href = bookingHrefForRole("host", booking);
    const payment = paymentsByBookingId.get(booking.id);

    if (booking.status === "pending") {
      notifications.push({
        id: `host-booking-pending:${booking.id}`,
        title: "New booking request",
        body: `${title} has a booking waiting for action.`,
        href,
        createdAt: booking.createdAt,
        category: "booking",
      });
    }

    if (booking.paymentStatus === "submitted") {
      notifications.push({
        id: `host-payment-submitted:${booking.id}`,
        title: "Guest submitted payment",
        body: `Payment for ${title} is waiting for your confirmation.`,
        href,
        createdAt: paymentEventTime(payment, booking),
        category: "payment",
      });
    }

    if (booking.paymentStatus === "paid" || booking.status === "confirmed") {
      notifications.push({
        id: `host-booking-confirmed:${booking.id}`,
        title: "Booking confirmed",
        body: `${title} is confirmed and ready for hosting.`,
        href,
        createdAt: paymentEventTime(payment, booking),
        category: "booking",
      });
    }

    if (booking.status === "cancelled") {
      notifications.push({
        id: `host-booking-cancelled:${booking.id}`,
        title: "Booking cancelled",
        body: `${title} has been cancelled.`,
        href,
        createdAt: booking.createdAt,
        category: "booking",
      });
    }
  }

  for (const property of properties) {
    if (property.hostId !== user.id) continue;
    if (property.status === "pending") {
      notifications.push({
        id: `host-listing-pending:${property.id}`,
        title: "Listing under review",
        body: `${property.title} is waiting for admin approval.`,
        href: `/host/listings/${property.id}`,
        createdAt: property.createdAt,
        category: "listing",
      });
    }
    if (property.status === "approved") {
      notifications.push({
        id: `host-listing-approved:${property.id}`,
        title: "Listing approved",
        body: `${property.title} is live for guests.`,
        href: `/host/listings/${property.id}`,
        createdAt: property.createdAt,
        category: "listing",
      });
    }
    if (property.status === "rejected") {
      notifications.push({
        id: `host-listing-rejected:${property.id}`,
        title: "Listing needs changes",
        body: `${property.title} was not approved yet.`,
        href: `/host/listings/${property.id}`,
        createdAt: property.createdAt,
        category: "listing",
      });
    }
  }
}

function auditHref(log: AuditLog) {
  if (log.action.startsWith("payment.")) return "/admin/payments";
  if (log.action.startsWith("listing.")) return "/admin/listings";
  if (log.action.startsWith("booking.")) return "/admin/bookings";
  if (log.action.startsWith("account.")) return "/admin/users";
  if (log.action.startsWith("support.")) return "/admin/support";
  return "/admin/dashboard";
}

function auditTitle(log: AuditLog) {
  const labels: Record<string, string> = {
    "payment.approved": "Payment approved",
    "payment.rejected": "Payment rejected",
    "payment.refunded": "Payment refunded",
    "booking.cancelled": "Booking cancelled",
    "listing.approved": "Listing approved",
    "listing.rejected": "Listing rejected",
    "account.anonymized": "Account anonymized",
    "account.email_changed": "Account email changed",
    "account.password_reset_requested": "Password reset requested",
    "account.password_reset_completed": "Password reset completed",
    "account.role_changed": "Account role changed",
    "auth.login_failed": "Failed sign-in recorded",
    "support.replied": "Support reply sent",
  };
  return labels[log.action] ?? "Platform activity";
}

function addAdminNotifications({
  notifications,
  bookings,
  properties,
  messages,
  paymentsByBookingId,
  usersById,
  auditLogs,
  user,
}: {
  notifications: ActivityNotification[];
  bookings: Booking[];
  properties: Property[];
  messages: Message[];
  paymentsByBookingId: Map<string, Payment>;
  usersById: Map<string, User>;
  auditLogs: AuditLog[];
  user: User;
}) {
  for (const property of properties) {
    if (property.status !== "pending") continue;
    notifications.push({
      id: `admin-listing-pending:${property.id}`,
      title: "Listing waiting for review",
      body: `${property.title} needs an approval decision.`,
      href: "/admin/listings",
      createdAt: property.createdAt,
      category: "listing",
    });
  }

  for (const booking of bookings) {
    const payment = paymentsByBookingId.get(booking.id);
    if (booking.paymentStatus === "submitted") {
      notifications.push({
        id: `admin-payment-submitted:${booking.id}`,
        title: "Payment needs verification",
        body: `Review a submitted payment for booking ${booking.id}.`,
        href: "/admin/payments",
        createdAt: paymentEventTime(payment, booking),
        category: "payment",
      });
    }
    if (booking.status === "pending") {
      notifications.push({
        id: `admin-booking-pending:${booking.id}`,
        title: "Open booking activity",
        body: `Booking ${booking.id} is still pending.`,
        href: "/admin/bookings",
        createdAt: booking.createdAt,
        category: "booking",
      });
    }
  }

  for (const message of messages) {
    if (message.receiverId !== user.id || message.bookingId || message.propertyId) continue;
    notifications.push({
      id: `admin-support-message:${message.id}`,
      title: "New support message",
      body: `${userName(usersById, message.senderId, "A user")}: ${compact(message.message, 72)}`,
      href: `/admin/support?userId=${encodeURIComponent(message.senderId)}`,
      createdAt: message.createdAt,
      category: "support",
    });
  }

  for (const log of auditLogs) {
    notifications.push({
      id: `audit:${log.id}`,
      title: auditTitle(log),
      body: `${log.actorRole === "system" ? "System" : "Admin"} activity on ${log.entityType}.`,
      href: auditHref(log),
      createdAt: log.createdAt,
      category: log.action.startsWith("auth.") || log.action.startsWith("account.") ? "security" : "activity",
    });
  }
}

export async function getNotificationsForUser(user: User, limit = 25): Promise<ActivityNotification[]> {
  const [bookings, messages, payments, properties, users, auditLogs, reviews] = await Promise.all([
    getBookings(),
    getMessages(),
    getPayments(),
    getProperties(),
    getUsers(),
    user.role === "admin" ? getAuditLogs(25) : Promise.resolve([]),
    user.role === "guest" || user.role === "host" ? getReviews() : Promise.resolve<Review[]>([]),
  ]);

  const notifications: ActivityNotification[] = [];
  const paymentsByBookingId = new Map(payments.map((payment) => [payment.bookingId, payment]));
  const propertiesById = new Map(properties.map((property) => [property.id, property]));
  const usersById = new Map(users.map((item) => [item.id, item]));

  // Match the review lookup used by getReviewForBooking: by bookingId, or by property + guest.
  const reviewedKeys = new Set<string>();
  for (const review of reviews) {
    if (review.bookingId) reviewedKeys.add(`b:${review.bookingId}`);
    reviewedKeys.add(`p:${review.propertyId}:${review.guestId}`);
  }
  const hasReview = (booking: Booking) =>
    reviewedKeys.has(`b:${booking.id}`) || reviewedKeys.has(`p:${booking.propertyId}:${booking.guestId}`);

  addMessageNotifications({ notifications, messages, user, usersById });

  if (user.role === "guest") {
    addGuestBookingNotifications({ notifications, bookings, paymentsByBookingId, propertiesById, hasReview, user });
  }

  if (user.role === "host") {
    addHostNotifications({ notifications, bookings, paymentsByBookingId, properties, propertiesById, reviews, usersById, user });
  }

  if (user.role === "admin") {
    addAdminNotifications({
      notifications,
      bookings,
      properties,
      messages,
      paymentsByBookingId,
      usersById,
      auditLogs,
      user,
    });
  }

  const deduped = Array.from(new Map(notifications.map((notification) => [notification.id, notification])).values());
  return deduped.toSorted(byNewest).slice(0, limit);
}
