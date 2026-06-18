import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getBookingById, markBookingPaid } from "@/lib/bookings";
import { logger } from "@/lib/logger";
import { getStripe, isStripeCheckoutEnabled } from "@/lib/payments";
import type Stripe from "stripe";

const webhookBookingIdSchema = z.string().trim().min(1).max(120);
const expectedCurrency = "php";

function providerTransactionId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string" ? session.payment_intent.trim() : "";
}

export async function POST(request: Request) {
  if (!isStripeCheckoutEnabled()) {
    return NextResponse.json({ error: "Paid bookings are disabled until StayPrimePH launches a verified payment provider." }, { status: 503 });
  }

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
    const parsedBookingId = webhookBookingIdSchema.safeParse(session.metadata?.bookingId);
    if (!parsedBookingId.success) {
      logger.warn("stripe_webhook_invalid_booking_id");
      return NextResponse.json({ error: "Invalid booking metadata." }, { status: 400 });
    }
    const bookingId = parsedBookingId.data;
    const transactionId = providerTransactionId(session);
    if (!transactionId) {
      logger.warn("stripe_webhook_missing_transaction_id", { bookingId });
      return NextResponse.json({ error: "Missing provider transaction ID." }, { status: 400 });
    }

    const booking = await getBookingById(bookingId);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    if (session.currency?.toLowerCase() !== expectedCurrency) {
      logger.warn("stripe_webhook_currency_mismatch", { bookingId, currency: session.currency });
      return NextResponse.json({ error: "Checkout currency mismatch." }, { status: 400 });
    }
    if (!Number.isSafeInteger(session.amount_total) || session.amount_total !== booking.totalPrice * 100) {
      logger.warn("stripe_webhook_amount_mismatch", { bookingId, amountTotal: session.amount_total });
      return NextResponse.json({ error: "Checkout amount mismatch." }, { status: 400 });
    }

    await markBookingPaid(bookingId, transactionId);
  }
  return NextResponse.json({ received: true });
}
