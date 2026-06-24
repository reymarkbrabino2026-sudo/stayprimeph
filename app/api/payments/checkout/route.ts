import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStateChangingApiRequest } from "@/lib/api-request-guard";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getStripe, isStripeCheckoutEnabled } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import {
  beginStripeCheckoutAttempt,
  checkoutInProgressMessage,
  clearStripeCheckoutAttempt,
  recordStripeCheckoutSession,
} from "@/lib/stripe-checkout-attempts";

const checkoutRequestSchema = z.object({
  bookingId: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  const guard = await requireStateChangingApiRequest(request);
  if (!guard.ok) return guard.response;
  const headerStore = guard.headers;

  if (!isStripeCheckoutEnabled()) {
    return NextResponse.json({ error: "Paid bookings are disabled until StayPrimePH launches a verified payment provider." }, { status: 503 });
  }

  let user;
  try {
    user = await requireRole("guest", { message: "Unauthorized", forbiddenMessage: "Forbidden" });
  } catch (error) {
    const message = error instanceof Error && error.message === "Forbidden" ? "Forbidden" : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
  try {
    requireVerifiedEmail(user);
  } catch {
    return NextResponse.json({ error: "Verify your email address before starting payment." }, { status: 403 });
  }

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("checkout", user.id, headerStore.get("x-forwarded-for")), 20);
  if (rateLimit.limited) {
    logger.warn("checkout_rate_limited", { userId: user.id });
    return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    logger.warn("checkout_invalid_request", { userId: user.id });
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const { bookingId } = parsed.data;
  const booking = (await getBookings()).find((item) => item.id === bookingId && item.guestId === user.id);
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status === "cancelled") return NextResponse.json({ error: "Cancelled bookings cannot be paid." }, { status: 400 });
  if (booking.paymentStatus === "paid") return NextResponse.json({ error: "This booking is already paid." }, { status: 400 });
  if (!Number.isSafeInteger(booking.totalPrice) || booking.totalPrice <= 0) {
    return NextResponse.json({ error: "Booking total is invalid." }, { status: 400 });
  }

  const property = await getPropertyById(booking.propertyId);
  const stripe = getStripe();
  if (!property || !stripe) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  try {
    await beginStripeCheckoutAttempt(booking);
  } catch (error) {
    if (error instanceof Error && error.message === checkoutInProgressMessage) {
      return NextResponse.json({ error: checkoutInProgressMessage }, { status: 409 });
    }
    logger.error("checkout_attempt_lock_failed", { userId: user.id, bookingId, error });
    return NextResponse.json({ error: "Unable to start checkout. Please try again later." }, { status: 503 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: booking.id,
      success_url: `${env.NEXT_PUBLIC_APP_URL}/guest/bookings/${booking.id}?payment=processing`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/guest/bookings/${booking.id}?payment=cancelled`,
      metadata: { bookingId: booking.id },
      payment_intent_data: { metadata: { bookingId: booking.id } },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "php",
          unit_amount: booking.totalPrice * 100,
          product_data: { name: property.title, description: `${booking.checkIn} to ${booking.checkOut}` },
        },
      }],
    });
  } catch (error) {
    await clearStripeCheckoutAttempt(booking.id);
    logger.error("stripe_checkout_session_failed", { userId: user.id, bookingId, error });
    return NextResponse.json({ error: "Payment provider is unavailable. Please try again later." }, { status: 502 });
  }

  if (typeof session.id === "string") {
    await recordStripeCheckoutSession(booking.id, session.id);
  }
  return NextResponse.json({ url: session.url });
}
