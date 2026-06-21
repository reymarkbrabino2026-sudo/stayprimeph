import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Car,
  Coffee,
  Dumbbell,
  MapPin,
  MessageCircle,
  Mountain,
  ParkingCircle,
  Quote,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Users,
  Utensils,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import { Navbar } from "@/components/public/navbar";
import { RoomBookingBar } from "@/components/rooms/room-booking-bar";
import { RoomGalleryCarousel } from "@/components/rooms/room-gallery-carousel";
import { RoomHeroSlideshow } from "@/components/rooms/room-hero-slideshow";
import { RoomMap } from "@/components/rooms/room-map";
import { RoomActions } from "@/components/rooms/room-actions";
import { RoomReservationCard } from "@/components/rooms/room-reservation-card";
import { getAvailabilityBlocksForProperty } from "@/lib/availability";
import { addDays } from "@/lib/availability-calendar";
import { getCurrentUser } from "@/lib/auth";
import { getBookingsForProperty } from "@/lib/bookings";
import { getPropertyById } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { getReviewsForProperty } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";
import { getUserById, getUsersByIds } from "@/lib/users";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

function amenityIcon(amenity: string) {
  const value = amenity.toLowerCase();
  if (value.includes("pool")) return Waves;
  if (value.includes("wi-fi") || value.includes("wifi") || value.includes("internet")) return Wifi;
  if (value.includes("kitchen")) return Utensils;
  if (value.includes("coffee") || value.includes("breakfast")) return Coffee;
  if (value.includes("parking")) return ParkingCircle;
  if (value.includes("car") || value.includes("transfer") || value.includes("shuttle")) return Car;
  if (value.includes("gym") || value.includes("fitness")) return Dumbbell;
  if (value.includes("air") || value.includes("cooling") || value.includes("conditioning")) return Snowflake;
  if (value.includes("view") || value.includes("mountain")) return Mountain;
  if (value.includes("beach") || value.includes("ocean") || value.includes("sea")) return Waves;
  if (value.includes("sun") || value.includes("deck") || value.includes("terrace")) return Sun;
  if (value.includes("workspace") || value.includes("work")) return Sparkles;
  return Wind;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property || property.status !== "approved") return { title: "Stay not found | StayPrimePH" };

  const locationLabel = formatPropertyLocation(property);
  const title = `${property.title} · ${locationLabel} | StayPrimePH`;
  const description = property.description;
  const image = property.images[0]?.imageUrl;

  return {
    title,
    description,
    alternates: { canonical: `/rooms/${property.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/rooms/${property.id}`,
      images: isRenderableImage(image) ? [{ url: image! }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: isRenderableImage(image) ? [image!] : undefined,
    },
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, currentUser] = await Promise.all([getPropertyById(id), getCurrentUser()]);

  if (!property) notFound();
  const canPreviewListing = currentUser?.role === "admin" || currentUser?.id === property.hostId;
  if (property.status !== "approved" && !canPreviewListing) notFound();

  const [host, propertyReviews, bookings, availabilityBlocks] = await Promise.all([
    getUserById(property.hostId),
    getReviewsForProperty(property.id),
    getBookingsForProperty(property.id),
    getAvailabilityBlocksForProperty(property.id),
  ]);
  const reviewGuests = await getUsersByIds(propertyReviews.map((review) => review.guestId));
  const reviewGuestById = new Map(reviewGuests.map((guest) => [guest.id, guest]));
  const unavailableStays = bookings
    .filter((booking) => booking.status !== "cancelled")
    .map((booking) => ({ checkIn: booking.checkIn, checkOut: booking.checkOut }))
    .concat(
      availabilityBlocks
        .filter((block) => block.propertyId === property.id)
        .map((block) => ({ checkIn: block.date, checkOut: addDays(block.date, 1) })),
    );
  const hostInitials =
    host?.avatar ?? host?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "H";
  const averageRating = propertyReviews.length
    ? (propertyReviews.reduce((sum, review) => sum + review.rating, 0) / propertyReviews.length).toFixed(2)
    : property.rating > 0
      ? property.rating.toFixed(2)
      : "New";
  const heroImage = property.images[0]?.imageUrl;
  const locationLabel = formatPropertyLocation(property);
  const galleryImages = property.images.length
    ? property.images
    : [{ id: "placeholder", propertyId: property.id, imageUrl: "", tone: "" }];
  const instantBook = property.rules.includes("Instant book enabled");
  const hostMessageHref = `/guest/messages?propertyId=${encodeURIComponent(property.id)}&hostId=${encodeURIComponent(property.hostId)}`;

  const stats = [
    { icon: Users, label: `${property.maxGuests} guests` },
    { icon: BedDouble, label: `${property.bedrooms} bedrooms` },
    { icon: Bath, label: `${property.bathrooms} baths` },
    { icon: Sparkles, label: property.propertyType },
  ];

  const faqs: [string, string][] = [
    [
      "Can I reserve immediately?",
      instantBook
        ? "Yes — this stay supports instant booking, so confirmed dates reserve the home right away."
        : "Your request is sent to the host for approval, then payment is collected once it's accepted.",
    ],
    ["Are exact location details public?", "The neighbourhood is shown on the map. The exact arrival address is shared after a confirmed booking."],
    ["Can I change my dates later?", "Date changes depend on host approval and the home's availability calendar."],
    ["What is the cancellation policy?", "Free cancellation for 48 hours after booking. After that the host's cancellation rules apply."],
  ];

  const breadcrumbItems: Crumb[] = [
    { label: property.country || "Philippines", href: "/search" },
    ...(property.city ? [{ label: property.city, href: `/search?location=${encodeURIComponent(property.city)}` }] : []),
    ...(property.barangay ? [{ label: property.barangay, href: `/search?location=${encodeURIComponent(property.barangay)}` }] : []),
    { label: property.title },
  ];

  const listingUrl = `${env.NEXT_PUBLIC_APP_URL}/rooms/${property.id}`;
  const listingImages = property.images
    .map((img) => img.imageUrl)
    .filter((url) => isRenderableImage(url))
    .map((url) => (url.startsWith("http") ? url : `${env.NEXT_PUBLIC_APP_URL}${url}`));

  const listingJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.title,
    description: property.description,
    ...(listingImages.length ? { image: listingImages } : {}),
    brand: { "@type": "Brand", name: "StayPrime PH" },
    offers: {
      "@type": "Offer",
      price: calculateGuestPriceWithMarkup(property.pricePerNight),
      priceCurrency: property.currency || "PHP",
      availability: "https://schema.org/InStock",
      url: listingUrl,
    },
    ...(propertyReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(averageRating),
            reviewCount: propertyReviews.length,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${env.NEXT_PUBLIC_APP_URL}${item.href}` } : {}),
    })),
  };

  return (
    <div className="bg-[#fbfaf7] text-[#1f1f1f]">
      <JsonLd data={listingJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <Navbar transparentOnTop hideBottomNav />

      <main>
        {/* Hero banner */}
        <section className="relative min-h-[100svh] overflow-hidden bg-[#14120f] text-white sm:min-h-[84svh] md:min-h-screen">
          <RoomHeroSlideshow images={property.images} alt={property.title} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/75" />
          <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-3 pb-[5.5rem] sm:min-h-[84svh] sm:px-5 sm:pb-44 md:min-h-screen md:pb-40">
            <div className="mx-auto w-full max-w-[88rem] px-4 sm:px-8">
              <Breadcrumbs items={breadcrumbItems} tone="light" className="mb-3 sm:mb-4" />
              <p className="mb-2 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/80 sm:mb-4 sm:gap-2 sm:text-sm sm:tracking-[0.28em]">
                <MapPin className="size-3 sm:size-[15px]" /> {locationLabel}
              </p>
              <h1 className="max-w-[18rem] text-[1.9rem] font-semibold leading-[1.04] tracking-normal drop-shadow min-[390px]:max-w-[21rem] min-[390px]:text-[2.2rem] sm:max-w-4xl sm:text-6xl sm:leading-[0.96] md:text-7xl">
                {property.title}
              </h1>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          {/* Intro */}
          <section id="overview" className="scroll-mt-32 border-b border-black/10 py-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a6a3f]">The retreat</p>
            <p className="mx-auto mt-5 max-w-3xl text-3xl font-medium leading-snug text-[#083f35] sm:text-[42px] sm:leading-[1.18]">
              {property.description}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {stats.map((stat) => (
                <span
                  key={stat.label}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold"
                >
                  <stat.icon size={16} className="text-[#8a6a3f]" /> {stat.label}
                </span>
              ))}
            </div>
          </section>

          {/* Overview + sticky booking card */}
          <section className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_minmax(360px,400px)] lg:gap-16">
            <div className="space-y-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">The stay</p>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
                  A private {property.propertyType.toLowerCase()} designed like a boutique resort escape.
                </h2>
                <p className="mt-5 max-w-xl leading-7 text-black/65">
                  Every detail is arranged for a calm arrival and an effortless stay — from the spaces you move
                  through to the comforts waiting when you settle in. Reserve in a few taps and keep the full
                  protection of the StayPrimePH booking experience.
                </p>
                <RoomActions propertyId={property.id} propertyTitle={property.title} isAuthenticated={Boolean(currentUser)} />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <Highlight
                  icon={ShieldCheck}
                  title="Protected booking"
                  body="Reviews, rules, and host details stay easy to check before you reserve."
                />
                <Highlight
                  icon={Sparkles}
                  title="Hotel-style arrival"
                  body="A polished, story-driven welcome that makes the home feel distinct."
                />
                <Highlight
                  icon={MapPin}
                  title="Curated location"
                  body="Set in a sought-after corner of the destination, mapped for you below."
                />
              </div>

              <div className="overflow-hidden rounded-[2rem] bg-[#e9e2d6]">
                <div className="relative min-h-[24rem]">
                  <GalleryImage src={property.images[1]?.imageUrl ?? heroImage} alt={`${property.title} interior`} />
                </div>
              </div>
            </div>

            <div id="mobile-reservation-card" className="lg:hidden">
              <RoomReservationCard property={property} rating={averageRating} unavailableStays={unavailableStays} />
            </div>

            <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
              <RoomReservationCard property={property} rating={averageRating} unavailableStays={unavailableStays} />
            </aside>
          </section>
        </div>

        {/* Photo carousel — full-bleed, 980x580 slides */}
        <section id="gallery" className="scroll-mt-32 border-t border-black/10 py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <SectionHeader
              eyebrow="Gallery"
              title="A visual preview of the experience"
              body="A closer look at the spaces you'll enjoy during your stay."
            />
          </div>
          <div className="mt-8">
            <RoomGalleryCarousel images={galleryImages.slice(0, 8)} title={property.title} />
          </div>
        </section>

        {/* Luxury amenities — full-bleed dark band */}
        <section id="amenities" className="scroll-mt-32 bg-[#053f34] py-20 text-white">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-end">
              <SectionHeader
                eyebrow="Amenities"
                title="Resort comforts, home-level control"
                body="Everything this home comes equipped with for a comfortable stay."
                light
              />
              <p className="w-full max-w-md text-sm leading-6 text-white/60 lg:justify-self-end lg:text-right">
                From everyday essentials to standout extras, here&apos;s what&apos;s included with your stay.
              </p>
            </div>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {property.amenities.map((amenity, index) => {
                const Icon = amenityIcon(amenity);
                const accent = index % 3 === 2;
                return (
                  <div
                    key={amenity}
                    className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${
                      accent ? "bg-[#c8f7bf] text-[#053f34]" : "bg-white/[0.06] text-white ring-1 ring-white/10"
                    }`}
                  >
                    <Icon className={`shrink-0 ${accent ? "text-[#053f34]" : "text-[#f4d7a1]"}`} size={24} />
                    <p className="text-base font-semibold leading-tight">{amenity}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          {/* Reviews */}
          <section id="reviews" className="scroll-mt-32 py-16">
            <SectionHeader
              eyebrow="Reviews"
              title={propertyReviews.length ? `${averageRating} guest score` : "Be the first to review"}
              body={
                propertyReviews.length
                  ? `${propertyReviews.length} guest note${propertyReviews.length === 1 ? "" : "s"} from recent stays.`
                  : "This listing is ready for its first guest review."
              }
            />
            {propertyReviews.length ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {propertyReviews.map((review) => {
                  const guest = reviewGuestById.get(review.guestId);
                  return (
                    <article
                      key={review.id}
                      className="relative rounded-[1.75rem] border border-black/10 bg-white p-7 shadow-[0_14px_44px_rgb(0_0_0_/_0.05)]"
                    >
                      <Quote className="text-[#e3d8c4]" size={30} />
                      <p className="mt-4 text-lg leading-8 text-black/75">{review.comment}</p>
                      <div className="mt-6 flex items-center justify-between gap-4 border-t border-black/10 pt-5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-11 place-items-center rounded-full bg-[#f6f1e9] text-sm font-semibold text-[#083f35]">
                            {guest?.avatar ?? "G"}
                          </span>
                          <div>
                            <p className="font-semibold">{guest?.name ?? "Guest"}</p>
                            <p className="text-sm text-black/50">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#083f35]">
                          <Star size={15} fill="currentColor" /> {review.rating}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 rounded-[1.5rem] border border-black/10 bg-white p-8 text-black/60">
                No guest reviews yet — be the first to stay and share your experience.
              </div>
            )}
          </section>

          {/* Location */}
          <section id="location" className="scroll-mt-32 border-t border-black/10 py-16">
            <SectionHeader
              eyebrow="Location"
              title={`Set in ${property.city}`}
              body={locationLabel}
            />
            <div className="mt-8">
              <RoomMap property={property} />
            </div>
          </section>

          {/* Host */}
          <section className="border-t border-black/10 py-16">
            <SectionHeader
              eyebrow="Your host"
              title={`Hosted by ${host?.name ?? "your host"}`}
              body="Get to know who you'll be staying with."
            />
            <div className="mt-8 grid gap-6 rounded-[2rem] border border-black/10 bg-white p-6 md:grid-cols-[17rem_1fr] md:p-8">
              <div className="rounded-[1.5rem] bg-[#f6f1e9] p-7 text-center">
                <div className="mx-auto grid size-24 place-items-center rounded-full bg-white text-3xl font-semibold text-[#083f35] shadow-sm">
                  {hostInitials}
                </div>
                <p className="mt-4 text-2xl font-semibold">{host?.name ?? "Host"}</p>
                <p className="text-black/55">Joined {formatDate(host?.createdAt ?? property.createdAt)}</p>
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-2xl font-semibold">Local care with platform protection</h3>
                <p className="mt-3 leading-7 text-black/65">
                  Message the host with any questions, review the house rules, and keep your reservation protected
                  inside StayPrimePH from request through checkout.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={hostMessageHref} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#083f35] px-6 font-semibold text-white transition hover:bg-[#062f28]">
                    <MessageCircle size={18} /> Message host
                  </Link>
                  <Link href={hostMessageHref} className="inline-flex min-h-12 items-center rounded-full bg-black/[0.05] px-5 font-medium text-black/70 transition hover:bg-black/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]">
                    Contact through StayPrimePH
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* House rules + FAQ */}
          <section className="border-t border-black/10 py-16">
            <SectionHeader
              eyebrow="Rules & FAQ"
              title="Know before you book"
              body="House rules, cancellation, and the details worth checking before you reserve."
            />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-black/10 bg-white p-7">
                <h3 className="text-xl font-semibold">House rules</h3>
                <div className="mt-5 space-y-3">
                  {property.rules.map((rule) => (
                    <p key={rule} className="flex items-center gap-3 text-black/70">
                      <ShieldCheck size={18} className="shrink-0 text-[#083f35]" /> {rule}
                    </p>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {faqs.map(([question, answer]) => (
                  <details key={question} className="group rounded-[1.25rem] border border-black/10 bg-white p-5">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">
                      {question}
                      <span className="text-[#8a6a3f] transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 leading-7 text-black/65">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      <RoomBookingBar property={property} unavailableStays={unavailableStays} />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
  light,
}: {
  eyebrow: string;
  title: string;
  body: string;
  light?: boolean;
}) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${light ? "text-[#f4d7a1]" : "text-[#8a6a3f]"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{title}</h2>
      <p className={`mt-3 max-w-2xl leading-7 ${light ? "text-white/65" : "text-black/62"}`}>{body}</p>
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
      <Icon className="rounded-full bg-[#f7f0e5] p-2 text-[#8a6a3f]" size={38} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/60">{body}</p>
    </div>
  );
}

function GalleryImage({ src, alt }: { src?: string; alt: string }) {
  if (!isRenderableImage(src))
    return <div className="h-full w-full bg-gradient-to-br from-[#e7dfd2] to-[#c8d8d1]" />;
  return (
    <Image
      src={src!}
      alt={alt}
      fill
      sizes="(min-width:1024px) 980px, 90vw"
      className="object-cover transition duration-500 hover:scale-105"
    />
  );
}
