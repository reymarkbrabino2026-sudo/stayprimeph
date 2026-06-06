import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getBookingById, markBookingPaid } from "@/lib/bookings";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/payments";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    logger.warn("stripe_webhook_missing_signature");
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    logger.warn("stripe_webhook_invalid_signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return NextResponse.json({ error: "Missing booking metadata." }, { status: 400 });

    const booking = await getBookingById(bookingId);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    if (session.currency !== "php" || session.amount_total !== booking.totalPrice * 100) {
      logger.warn("stripe_webhook_amount_mismatch", { bookingId });
      return NextResponse.json({ error: "Checkout amount mismatch." }, { status: 400 });
    }

    await markBookingPaid(bookingId, String(session.payment_intent ?? session.id));
  }
  return NextResponse.json({ received: true });
}
