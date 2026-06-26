import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Camera,
  Car,
  Coffee,
  Dumbbell,
  FireExtinguisher,
  Flame,
  HeartPulse,
  House,
  ListChecks,
  MapPin,
  MessageCircle,
  Mountain,
  ParkingCircle,
  Quote,
  ShieldCheck,
  Siren,
  Snowflake,
  Star,
  Sun,
  Trees,
  Tv,
  Users,
  Utensils,
  Waves,
  Wifi,
  WashingMachine,
} from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { allowsPackageBooking, calculateGuestPriceWithMarkup, isEntirePlaceListing } from "@/lib/pricing";
import { Navbar } from "@/components/public/navbar";
import { RoomBookingBar } from "@/components/rooms/room-booking-bar";
import { RoomGalleryShowcase } from "@/components/rooms/room-gallery-showcase";
import { RoomHeroSlideshow } from "@/components/rooms/room-hero-slideshow";
import { RoomMap } from "@/components/rooms/room-map";
import { RoomActions } from "@/components/rooms/room-actions";
import { RoomAccessPreview } from "@/components/rooms/room-access-preview";
import { RoomDescriptionDisclosure } from "@/components/rooms/room-description-disclosure";
import { RoomReservationCard, RoomStickyReservationCard } from "@/components/rooms/room-reservation-card";
import { RoomVirtualTour } from "@/components/rooms/room-virtual-tour";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getAvailabilityBlocksForProperty } from "@/lib/availability";
import { addDays } from "@/lib/availability-calendar";
import { getCurrentUser } from "@/lib/auth";
import { getBookingsForProperty } from "@/lib/bookings";
import { getPropertyById } from "@/lib/properties";
import { formatPropertyLocation } from "@/lib/property-location";
import { buildRoomPhotoTourGroups } from "@/lib/room-photo-tour";
import { getReviewsForProperty } from "@/lib/reviews";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getUserById, getUsersByIds } from "@/lib/users";

function isRenderableImage(src?: string): src is string {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

function compactStrings(items: Array<string | null | undefined>) {
  return items.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
}

function amenityIcon(amenity: string) {
  const value = amenity.toLowerCase();
  if (value.includes("pool")) return Waves;
  if (value.includes("wi-fi") || value.includes("wifi") || value.includes("internet")) return Wifi;
  if (value.includes("tv") || value.includes("television") || value.includes("netflix")) return Tv;
  if (value.includes("kitchen")) return Utensils;
  if (value.includes("coffee") || value.includes("breakfast")) return Coffee;
  if (value.includes("bbq") || value.includes("barbecue") || value.includes("grill")) return Flame;
  if (value.includes("first aid") || value.includes("medical")) return HeartPulse;
  if (value.includes("fire extinguisher")) return FireExtinguisher;
  if (value.includes("smoke") || value.includes("alarm")) return Siren;
  if (value.includes("camera") || value.includes("cctv")) return Camera;
  if (value.includes("washer") || value.includes("laundry")) return WashingMachine;
  if (value.includes("parking")) return ParkingCircle;
  if (value.includes("car") || value.includes("transfer") || value.includes("shuttle")) return Car;
  if (value.includes("gym") || value.includes("fitness")) return Dumbbell;
  if (value.includes("air") || value.includes("cooling") || value.includes("conditioning")) return Snowflake;
  if (value.includes("view") || value.includes("mountain")) return Mountain;
  if (value.includes("beach") || value.includes("ocean") || value.includes("sea")) return Waves;
  if (value.includes("patio") || value.includes("garden") || value.includes("yard") || value.includes("outdoor")) return Trees;
  if (value.includes("sun") || value.includes("deck") || value.includes("terrace") || value.includes("balcony")) return Sun;
  if (value.includes("workspace") || value.includes("work")) return ListChecks;
  return House;
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
  const title = `${property.title} | ${locationLabel} | StayPrimePH`;
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
    .map((booking) => ({ checkIn: booking.checkIn, checkOut: booking.checkOut, bookingPackageId: booking.bookingPackageId }))
    .concat(
      availabilityBlocks
        .filter((block) => block.propertyId === property.id)
        .map((block) => ({ checkIn: block.date, checkOut: addDays(block.date, 1), bookingPackageId: undefined })),
    );
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
  const packageBookingAllowed = allowsPackageBooking(property);
  const wholePlaceAccessEnabled = isEntirePlaceListing(property);
  const activeRooms = wholePlaceAccessEnabled ? (property.rooms ?? []).filter((room) => room.active) : [];
  const photoTourRooms = (property.rooms ?? []).filter((room) => room.active);
  const showListingSpacesPreview = wholePlaceAccessEnabled && (packageBookingAllowed || activeRooms.length > 0);
  const placeParts = compactStrings([property.barangay, property.city, property.province, property.country]);
  const cityLabel = property.city || property.province || property.country || "the Philippines";
  const areaLabel = placeParts.length ? placeParts.join(", ") : locationLabel;
  const propertyTypeLabel = property.propertyType || "stay";
  const lowerPropertyType = propertyTypeLabel.toLowerCase();
  const bedroomsLabel = `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}`;
  const bathsLabel = `${property.bathrooms} bath${property.bathrooms === 1 ? "" : "s"}`;
  const nightlyLabel = `${formatCurrency(calculateGuestPriceWithMarkup(property.pricePerNight))} / night`;
  const bookingVerb = instantBook ? "Reserve instantly" : "Request to book";
  const photoTourGroups = buildRoomPhotoTourGroups({
    propertyTitle: property.title,
    propertyTypeLabel,
    listingImages: property.images,
    rooms: photoTourRooms,
  });

  const stats = [
    { icon: Users, label: `${property.maxGuests} guests` },
    { icon: BedDouble, label: bedroomsLabel },
    { icon: Bath, label: bathsLabel },
    { icon: House, label: propertyTypeLabel },
  ];

  const featureHighlights = [
    {
      icon: ShieldCheck,
      title: "Protected booking",
      body: "Review the rules, price, and host details before your stay is confirmed.",
    },
    {
      icon: ListChecks,
      title: "Stay-ready details",
      body: "Photos, amenities, access, and availability are gathered into one clear page.",
    },
    {
      icon: MapPin,
      title: "Local context",
      body: "The neighbourhood is shown up front while exact arrival details stay private until booking.",
    },
  ];

  const neighbourhoodGroups = [
    { title: "Stay", items: stats.map((stat) => stat.label) },
    { title: "Location", items: placeParts.length ? placeParts.slice(0, 4) : [locationLabel] },
    { title: "Included", items: property.amenities.slice(0, 5) },
    { title: "Rules", items: property.rules.slice(0, 5) },
  ].filter((group) => group.items.length > 0);

  const faqs: [string, string][] = [
    [
      "Can I reserve immediately?",
      instantBook
        ? "Yes, this stay supports instant booking, so confirmed dates reserve the home right away."
        : "Your request is sent to the host for approval, then payment is collected once it is accepted.",
    ],
    ["Are exact location details public?", "The neighbourhood is shown on the map. The exact arrival address is shared after a confirmed booking."],
    ["Can I change my dates later?", "Date changes depend on host approval and the home's availability calendar."],
    ["What is the cancellation policy?", "You can cancel before check-in from your booking details page. Refund review depends on payment status, payment timing, and how close the stay is to check-in."],
  ];

  const breadcrumbItems: Crumb[] = [
    { label: property.country || "Philippines", href: "/search" },
    ...(property.city ? [{ label: property.city, href: `/search?location=${encodeURIComponent(property.city)}` }] : []),
    ...(property.barangay ? [{ label: property.barangay, href: `/search?location=${encodeURIComponent(property.barangay)}` }] : []),
    { label: property.title },
  ];
  const heroBreadcrumbItems = breadcrumbItems.length > 1 ? breadcrumbItems.slice(0, -1) : breadcrumbItems;

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

  const faqJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <div className="bg-[#efefed] text-[#111111]">
      <JsonLd data={listingJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Navbar transparentOnTop hideBottomNav />

      <main>
        <section className="relative h-[92svh] min-h-[34rem] max-h-[54rem] overflow-hidden bg-[#151515] text-white lg:h-screen lg:min-h-[100svh] lg:max-h-none">
          <RoomHeroSlideshow images={property.images} alt={property.title} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/12 to-black/68" />
          <div className="pointer-events-none absolute inset-x-0 top-24 z-20 px-5 sm:top-32 sm:px-8">
            <div className="mx-auto w-full max-w-[88rem]">
              <Breadcrumbs items={heroBreadcrumbItems} tone="light" className="pointer-events-auto" />
            </div>
          </div>
          <div className="relative z-10 flex h-full items-end px-5 pb-8 sm:px-8 sm:pb-16">
            <div className="mx-auto grid w-full max-w-[88rem] gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <p className="mb-3 inline-flex max-w-full items-center gap-2 truncate text-xs font-semibold uppercase text-white/85 min-[390px]:text-sm sm:mb-4">
                  <MapPin size={16} /> {locationLabel}
                </p>
                <h1 className="line-clamp-2 max-w-5xl break-words text-[clamp(2.75rem,14vw,4.5rem)] font-semibold leading-[0.95] drop-shadow-sm sm:text-7xl md:text-8xl">
                  {property.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/86 sm:mt-5 sm:text-lg">
                  {bedroomsLabel} {lowerPropertyType} from {nightlyLabel}
                </p>
              </div>
              <Link
                href="#booking"
                className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#111111] transition hover:bg-[#f4eadc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-fit"
              >
                {bookingVerb}
              </Link>
            </div>
          </div>
        </section>

        <section id="overview" className="relative scroll-mt-28 overflow-hidden bg-[#efefed] py-12 sm:scroll-mt-32 sm:py-24 lg:py-32">
          <RouteLineBackdrop />
          <div className="relative mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
            <div className="flex items-center gap-3 sm:gap-4">
              <p className="text-xs font-semibold uppercase text-[#0f5750] min-[390px]:text-sm">You arrive. We keep it simple.</p>
              <span className="h-px min-w-10 flex-1 bg-[#0f5750]/35 sm:w-24 sm:flex-none" />
            </div>
            <h2 className="mt-6 max-w-5xl text-3xl font-semibold leading-tight text-black min-[390px]:text-4xl sm:mt-8 sm:text-6xl lg:text-7xl">
              {propertyTypeLabel} living in {cityLabel}.
            </h2>
            <div className="mt-8 grid gap-7 sm:mt-12 sm:gap-10 lg:grid-cols-[0.72fr_1fr] lg:pl-[12%]">
              <RoomDescriptionDisclosure
                description={property.description}
                propertyTypeLabel={propertyTypeLabel}
                locationLabel={locationLabel}
                bedroomsLabel={bedroomsLabel}
                bathsLabel={bathsLabel}
                maxGuests={property.maxGuests}
                amenities={property.amenities}
                rules={property.rules}
              />
              <div className="space-y-4 text-base leading-7 text-black/70 sm:space-y-5 sm:text-lg sm:leading-8">
                <p>
                  Set around {areaLabel}, this listing keeps the essentials visible: location, inclusions,
                  house rules, reviews, and live booking dates in one steady flow.
                </p>
                <p>
                  The page is designed like a viewing before a reservation, with large imagery, plain copy, and
                  the booking tool close by when you are ready.
                </p>
              </div>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex min-h-20 items-center gap-3 bg-[#f7f5ef] p-4 sm:min-h-28 sm:gap-4 sm:p-5">
                  <stat.icon size={24} className="shrink-0 text-[#0f5750]" />
                  <p className="text-base font-semibold sm:text-lg">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="scroll-mt-28 bg-[#efefed] py-12 sm:scroll-mt-32 sm:py-24">
          <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
            <SectionHeader
              eyebrow="Gallery"
              title="A visual preview of the experience"
              body="A closer look at the spaces you will use during your stay."
              titleClassName="md:max-w-none md:whitespace-nowrap"
            />
          </div>
          <div className="mt-8">
            <RoomGalleryShowcase
              images={galleryImages.slice(0, 8)}
              title={property.title}
              groups={photoTourGroups}
              propertyId={property.id}
              isAuthenticated={Boolean(currentUser)}
            />
          </div>
        </section>

        <section id="booking" data-reservation-sticky-boundary className="scroll-mt-28 bg-[#f8f6f1] py-12 sm:scroll-mt-32 sm:py-24">
          <div className="mx-auto grid max-w-[88rem] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_minmax(360px,400px)] lg:gap-16 lg:px-12">
            <div className="space-y-8 sm:space-y-10">
              <div>
                <SectionHeader
                  eyebrow="Available stays"
                  title={packageBookingAllowed ? "Choose the stay that fits." : "Find your dates."}
                  body={
                    packageBookingAllowed
                      ? "Select dates, guests, and available booking packages from the reservation panel."
                      : "Pick dates, check the total, and send your reservation request when the stay works for you."
                  }
                />
                <div className="mt-7">
                  <RoomActions propertyId={property.id} propertyTitle={property.title} isAuthenticated={Boolean(currentUser)} />
                </div>
              </div>

              <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
                {featureHighlights.map((item) => (
                  <Highlight key={item.title} icon={item.icon} title={item.title} body={item.body} />
                ))}
              </div>

              <div className="grid gap-5 border-y border-black/10 py-7 sm:py-8 md:grid-cols-[0.82fr_1fr] md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#0f5750] min-[390px]:text-sm">A closer look</p>
                  <h3 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Images that work like a viewing.</h3>
                </div>
                <div className="relative min-h-[18rem] overflow-hidden rounded-lg bg-[#dedad2] min-[390px]:min-h-[22rem]">
                  <GalleryImage src={property.images[1]?.imageUrl ?? heroImage} alt={`${property.title} interior`} />
                </div>
              </div>
            </div>

            <div id="mobile-reservation-card" className="scroll-mt-28 lg:hidden">
              <RoomReservationCard property={property} rating={averageRating} unavailableStays={unavailableStays} />
            </div>

            <RoomStickyReservationCard property={property} rating={averageRating} unavailableStays={unavailableStays} />
          </div>
        </section>

        {showListingSpacesPreview ? (
          <section id="listing-spaces" className="scroll-mt-28 bg-white py-12 sm:scroll-mt-32 sm:py-20">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
              <SectionHeader
                eyebrow="Inside the listing"
                title="Rooms and access"
                body="A quick look at the rooms, guest capacity, and access included with this listing."
              />
              <div className="mt-8">
                <RoomAccessPreview rooms={activeRooms} listingImages={property.images} />
              </div>
            </div>
          </section>
        ) : null}

        <RoomVirtualTour property={property} />

        <section id="amenities" className="scroll-mt-28 bg-white py-12 sm:scroll-mt-32 sm:py-24">
          <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1fr] lg:items-start">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <SectionHeader
                  eyebrow="What's included"
                  title="Comforts that make the stay easier."
                  body="The practical details are kept visible, from everyday essentials to the amenities that make this listing stand out."
                />
              </div>
              <div className="grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
                {property.amenities.map((amenity) => {
                  const Icon = amenityIcon(amenity);
                  return (
                    <div key={amenity} className="flex min-h-20 items-center gap-3 bg-[#f8f6f1] p-4 sm:min-h-24 sm:gap-4 sm:p-5">
                      <Icon className="shrink-0 text-[#0f5750]" size={24} />
                      <p className="text-base font-semibold leading-snug">{amenity}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="location" className="relative scroll-mt-28 overflow-hidden bg-[#efefed] py-12 sm:scroll-mt-32 sm:py-24">
          <RouteLineBackdrop />
          <div className="relative mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-[0.82fr_1fr] lg:items-start">
              <div>
                <SectionHeader
                  eyebrow="Location"
                  title={`The ${cityLabel} setting.`}
                  body={`Stay close to ${locationLabel}. Exact arrival details are shared after confirmation.`}
                />
                <div className="mt-8 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
                  {neighbourhoodGroups.map((group) => (
                    <div key={group.title} className="bg-[#f8f6f1] p-5">
                      <h3 className="text-sm font-semibold uppercase text-[#0f5750]">{group.title}</h3>
                      <ul className="mt-4 space-y-2 text-sm leading-6 text-black/70">
                        {group.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <RoomMap property={property} />
              </div>
            </div>
          </div>
        </section>

        <section id="reviews" className="scroll-mt-28 bg-white py-12 sm:scroll-mt-32 sm:py-24">
          <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
            <SectionHeader
              eyebrow="Guest notes"
              title={propertyReviews.length ? "What guests say." : "Ready for the first guest note."}
              body={
                propertyReviews.length
                  ? `${propertyReviews.length} review${propertyReviews.length === 1 ? "" : "s"} from recent stays.`
                  : "This listing is ready for its first StayPrimePH review."
              }
            />
            {propertyReviews.length ? (
              <div className="mt-9 grid gap-px overflow-hidden border border-black/10 bg-black/10 lg:grid-cols-3">
                {propertyReviews.slice(0, 6).map((review) => {
                  const guest = reviewGuestById.get(review.guestId);
                  return (
                    <article key={review.id} className="flex min-h-[22rem] flex-col justify-between bg-[#f8f6f1] p-6">
                      <div>
                        <Quote className="text-[#0f5750]" size={30} />
                        <p className="mt-5 text-lg leading-8 text-black/75">{review.comment}</p>
                      </div>
                      <div className="mt-7 flex items-center justify-between gap-4 border-t border-black/10 pt-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar avatar={guest?.avatar} name={guest?.name ?? "Guest"} fallback="G" className="size-11 bg-white text-sm font-semibold text-[#0f5750]" imageSizes="44px" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{guest?.name ?? "Guest"}</p>
                            <p className="text-sm text-black/50">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              size={15}
                              fill={index < review.rating ? "currentColor" : "none"}
                              className={index < review.rating ? "text-[#0f5750]" : "text-black/20"}
                            />
                          ))}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-9 border border-black/10 bg-[#f8f6f1] p-8 text-black/62">
                No guest reviews yet. Be the first to stay and share your experience.
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#0f5750] py-12 text-white sm:py-24">
          <div className="mx-auto grid max-w-[88rem] gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12">
            <div>
              <p className="text-xs font-semibold uppercase text-[#d7f1e8] min-[390px]:text-sm">Ready to make the move?</p>
              <h2 className="mt-4 text-4xl font-semibold leading-none sm:text-7xl">Let&apos;s talk.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:mt-6 sm:text-lg sm:leading-8">
                Message the host, check the rules, or return to the reservation panel when you are ready to book.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={hostMessageHref} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-[#0f5750] transition hover:bg-[#f4eadc]">
                  <MessageCircle size={18} /> Message host
                </Link>
                <Link href="#booking" className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 font-semibold text-white transition hover:bg-white/10">
                  View dates
                </Link>
              </div>
            </div>
            <div className="grid gap-px overflow-hidden border border-white/20 bg-white/20 sm:grid-cols-[17rem_1fr]">
              <div className="bg-white/10 p-6 text-center sm:p-7">
                <UserAvatar avatar={host?.avatar} name={host?.name ?? "Host"} fallback="H" className="mx-auto size-24 bg-white text-3xl font-semibold text-[#0f5750]" imageSizes="96px" />
                <p className="mt-4 text-2xl font-semibold">{host?.name ?? "Host"}</p>
                <p className="text-white/65">Joined {formatDate(host?.createdAt ?? property.createdAt)}</p>
              </div>
              <div className="flex flex-col justify-center bg-white/10 p-6 sm:p-7">
                <h3 className="text-xl font-semibold sm:text-2xl">Local care with platform protection</h3>
                <p className="mt-3 leading-7 text-white/72">
                  Keep your questions, reservation, and stay details inside StayPrimePH from request through checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f8f6f1] py-12 sm:py-24">
          <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
            <SectionHeader
              eyebrow="Rules and FAQ"
              title="Know before you book."
              body="House rules, cancellation, and the details worth checking before you reserve."
            />
            <div className="mt-8 grid gap-5 sm:mt-9 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border border-black/10 bg-white p-5 sm:p-6">
                <h3 className="text-xl font-semibold">House rules</h3>
                <div className="mt-5 space-y-3">
                  {property.rules.map((rule) => (
                    <p key={rule} className="flex items-center gap-3 text-black/70">
                      <ShieldCheck size={18} className="shrink-0 text-[#0f5750]" /> {rule}
                    </p>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {faqs.map(([question, answer]) => (
                  <details key={question} className="group border border-black/10 bg-white p-5">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">
                      {question}
                      <span className="text-[#0f5750] transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 leading-7 text-black/65">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
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
  titleClassName,
}: {
  eyebrow: string;
  title: string;
  body: string;
  light?: boolean;
  titleClassName?: string;
}) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase ${light ? "text-[#d7f1e8]" : "text-[#0f5750]"}`}>{eyebrow}</p>
      <h2 className={`mt-3 max-w-3xl text-3xl font-semibold leading-tight min-[390px]:text-4xl sm:text-5xl ${titleClassName ?? ""}`}>{title}</h2>
      <p className={`mt-4 max-w-2xl leading-7 ${light ? "text-white/70" : "text-black/62"}`}>{body}</p>
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
    <div className="border border-black/10 bg-white p-4 sm:p-5">
      <Icon className="text-[#0f5750]" size={30} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/60">{body}</p>
    </div>
  );
}

function RouteLineBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <div className="absolute -left-36 top-32 h-[34rem] w-[26rem] rounded-full border-[34px] border-white/70" />
      <div className="absolute -right-28 top-0 h-[42rem] w-[24rem] rounded-full border-[34px] border-white/70" />
    </div>
  );
}

function GalleryImage({ src, alt, priority }: { src?: string; alt: string; priority?: boolean }) {
  if (!isRenderableImage(src)) return <div className="h-full w-full bg-[#dedad2]" />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="(min-width:1024px) 980px, 90vw"
      className="object-cover"
    />
  );
}
