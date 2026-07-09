import { calculateGuestPriceWithMarkup } from "@/lib/pricing";
import type { Property, Review, User } from "@/lib/types";

type ListingProductJsonLdInput = {
  property: Property;
  reviews: Review[];
  reviewGuestById: Map<string, Pick<User, "name"> | undefined>;
  listingUrl: string;
  listingImages: string[];
};

function validRating(review: Review) {
  return Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5;
}

function averageRating(reviews: Review[]) {
  return Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2));
}

function reviewJsonLd(review: Review, guest?: Pick<User, "name">) {
  const authorName = guest?.name?.trim();
  const reviewBody = review.comment.trim();

  if (!authorName || !reviewBody || !validRating(review)) return null;

  return {
    "@type": "Review",
    author: { "@type": "Person", name: authorName },
    datePublished: review.createdAt,
    reviewBody,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

export function buildListingProductJsonLd({
  property,
  reviews,
  reviewGuestById,
  listingUrl,
  listingImages,
}: ListingProductJsonLdInput): Record<string, unknown> | null {
  const ratedReviews = reviews.filter(validRating);

  if (ratedReviews.length === 0) return null;

  const visibleReviewMarkup = ratedReviews
    .slice(0, 6)
    .map((review) => reviewJsonLd(review, reviewGuestById.get(review.guestId)))
    .filter((review): review is NonNullable<typeof review> => Boolean(review));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${listingUrl}#listing`,
    name: property.title,
    description: property.description,
    url: listingUrl,
    sku: property.id,
    category: property.propertyType,
    ...(listingImages.length ? { image: listingImages } : {}),
    brand: { "@type": "Brand", name: "StayPrime PH" },
    offers: {
      "@type": "Offer",
      price: calculateGuestPriceWithMarkup(property.pricePerNight),
      priceCurrency: property.currency || "PHP",
      availability: "https://schema.org/InStock",
      url: listingUrl,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: averageRating(ratedReviews),
      reviewCount: ratedReviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    ...(visibleReviewMarkup.length ? { review: visibleReviewMarkup } : {}),
  };
}
