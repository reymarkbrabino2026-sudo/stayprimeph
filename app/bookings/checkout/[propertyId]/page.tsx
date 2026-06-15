import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { createBooking } from "@/app/bookings/checkout/[propertyId]/actions";
import { getCurrentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getBookings, hasDateConflict } from "@/lib/bookings";
import { calculateStayprimeMarkup, getBestDiscount } from "@/lib/pricing";
import { getPropertyById } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { formatCurrency } from "@/lib/utils";

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

function validDateParam(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatStayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export default async function BookingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string; error?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const property = await getPropertyById(propertyId);
  if (!property || property.status !== "approved") notFound();

  const today = todayDateKey();
  const requestedCheckIn = validDateParam(query.checkIn);
  const checkIn = requestedCheckIn && requestedCheckIn >= today ? requestedCheckIn : today;
  const requestedCheckOut = validDateParam(query.checkOut);
  const checkOut = requestedCheckOut && new Date(requestedCheckOut) > new Date(checkIn) ? requestedCheckOut : addDays(checkIn, 5);
  const requestedGuests = Number(query.guests ?? 1);
  const guests = Number.isInteger(requestedGuests) ? Math.min(property.maxGuests, Math.max(1, requestedGuests)) : 1;
  const nights = Math.min(90, nightsBetween(checkIn, checkOut));
  const subtotal = property.pricePerNight * nights;
  const bookings = await getBookings();
  const currentUser = await getCurrentUser();
  const discount = getBestDiscount({ property, bookings, checkIn, nights, subtotal });
  const discountedSubtotal = subtotal - (discount?.amount ?? 0);
  const serviceFee = calculateStayprimeMarkup(discountedSubtotal);
  const total = discountedSubtotal + serviceFee;
  const unavailable = hasDateConflict(bookings, property.id, checkIn, checkOut);
  const image = property.images[0]?.imageUrl;
  const buttonLabel = property.rules.includes("Instant book enabled") ? "Confirm and pay" : "Request to book";
  const locationLabel = formatPropertyLocation(property);
  const guestOnly = currentUser?.role && currentUser.role !== "guest";
  const roleError = guestOnly || query.error === "guest-only";

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex h-20 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link href={`/rooms/${property.id}`} className="grid size-10 place-items-center rounded-full transition hover:bg-black/[0.04]" aria-label="Back to listing">
            <ChevronLeft size={22} />
          </Link>
          <Link href="/" aria-label="StayPrimePH home" className="ml-2 inline-flex">
            <BrandLogo className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8 lg:pt-12">
        <section className="min-w-0">
          <p className="text-sm font-bold text-[#083f35]">Request to book</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Review your trip</h1>

          <form action={createBooking} className="mt-8 space-y-8">
            <input type="hidden" name="propertyId" value={property.id} />

            <section className="border-b pb-8">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold">Your trip</h2>
                <Link href={`/rooms/${property.id}`} className="text-sm font-semibold underline underline-offset-2">Edit</Link>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block rounded-2xl border p-4">
                  <span className="block text-sm font-semibold">Dates</span>
                  <span className="mt-1 block text-sm text-black/65">{formatStayDate(checkIn)} - {formatStayDate(checkOut)}</span>
                  <span className="sr-only">Check-in</span>
                  <input name="checkIn" type="date" defaultValue={checkIn} className="mt-3 min-h-11 w-full rounded-xl border px-3" required />
                </label>
                <label className="block rounded-2xl border p-4">
                  <span className="block text-sm font-semibold">Checkout</span>
                  <span className="mt-1 block text-sm text-black/65">{formatStayDate(checkOut)}</span>
                  <span className="sr-only">Check-out</span>
                  <input name="checkOut" type="date" defaultValue={checkOut} className="mt-3 min-h-11 w-full rounded-xl border px-3" required />
                </label>
              </div>
              <label className="mt-4 block rounded-2xl border p-4">
                <span className="block text-sm font-semibold">Guests</span>
                <span className="mt-1 block text-sm text-black/65">{guests} guest{guests === 1 ? "" : "s"}</span>
                <input name="guests" type="number" min={1} max={property.maxGuests} defaultValue={guests} className="mt-3 min-h-11 w-full rounded-xl border px-3" required />
              </label>
            </section>

            <section className="border-b pb-8">
              <h2 className="text-xl font-semibold">Pay with</h2>
              <div className="mt-4 rounded-2xl border p-4">
                <p className="font-medium">Payment is recorded after your booking request is created.</p>
                <p className="mt-1 text-sm text-black/60">For now, you can transfer through GCash or bank transfer outside StayPrimePH, then submit the payment reference from your booking details page.</p>
              </div>
            </section>

            <section className="border-b pb-8">
              <h2 className="text-xl font-semibold">Cancellation policy</h2>
              <p className="mt-3 text-black/70">Free cancellation for 48 hours after booking. After that, the host&apos;s cancellation rules apply.</p>
            </section>

            <section className="border-b pb-8">
              <h2 className="text-xl font-semibold">Ground rules</h2>
              <div className="mt-4 grid gap-3">
                {property.rules.slice(0, 3).map((rule) => (
                  <p key={rule} className="flex items-center gap-3 text-sm text-black/70">
                    <ShieldCheck size={18} />
                    {rule}
                  </p>
                ))}
              </div>
            </section>

            <div className={`rounded-2xl p-4 text-sm ${unavailable || roleError ? "bg-rose-50 text-rose-700" : "bg-black/[0.04] text-black/65"}`}>
              {roleError
                ? "Use a guest account to request this stay. Admin and host accounts cannot create guest bookings."
                : unavailable
                  ? "These dates are already booked. Choose another stay window."
                  : "Dates are available. Your booking will be sent to the host unless instant booking is enabled."}
            </div>
            <p className="text-xs leading-6 text-black/55">
              By selecting the button below, you agree to the house rules, cancellation policy, and guest refund policy.
            </p>

            <button disabled={unavailable || Boolean(guestOnly)} className="min-h-14 w-full rounded-xl bg-[#083f35] px-6 text-base font-semibold text-white transition hover:bg-[#062f28] disabled:cursor-not-allowed disabled:bg-black/20 sm:w-auto sm:min-w-56">
              {buttonLabel}
            </button>
          </form>
        </section>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-3xl border bg-white p-5 shadow-[0_18px_60px_rgb(0_0_0_/_0.10)] sm:p-6">
            <div className="flex gap-4">
              <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100">
                {isRenderableImage(image) ? <Image src={image!} alt={property.title} fill sizes="112px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold">{property.title}</p>
                <p className="mt-1 text-sm text-black/55">{locationLabel}</p>
                <p className="mt-2 flex items-center gap-1 text-sm">
                  <Star size={14} fill="currentColor" />
                  <span className="font-semibold">{property.rating || "New"}</span>
                  <span className="text-black/50">Guest favorite</span>
                </p>
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <h2 className="text-xl font-semibold">Price details</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="underline decoration-black/25 underline-offset-4">{formatCurrency(property.pricePerNight)} x {nights} nights</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount ? (
                  <div className="flex justify-between gap-4 text-emerald-700">
                    <span>{discount.label}</span>
                    <span>-{formatCurrency(discount.amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <span className="underline decoration-black/25 underline-offset-4">StayPrimePH markup (20%)</span>
                  <span>{formatCurrency(serviceFee)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between border-t pt-6 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
