import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/payments";
import { getPropertyById } from "@/lib/properties";
import { checkDistributedRateLimit } from "@/lib/rate-limit";

const checkoutRequestSchema = z.object({
  bookingId: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "guest") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const headerStore = await headers();
  const rateLimit = await checkDistributedRateLimit(`checkout:${user.id}:${headerStore.get("x-forwarded-for") ?? "local"}`, 20);
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
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/guest/bookings/${booking.id}?payment=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/guest/bookings/${booking.id}?payment=cancelled`,
    metadata: { bookingId: booking.id },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "php",
        unit_amount: booking.totalPrice * 100,
        product_data: { name: property.title, description: `${booking.checkIn} to ${booking.checkOut}` },
      },
    }],
  });
  return NextResponse.json({ url: session.url });
}
