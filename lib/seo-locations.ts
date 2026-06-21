// SEO landing-page definitions for high-intent location searches. Each entry
// powers /staycation/[slug] with a tailored title, H1, and keyword-rich copy.
export type SeoLocation = {
  slug: string;
  name: string;
  // Lowercase text matched against getPropertyLocationSearchText() to find local listings.
  query: string;
  region: string;
  title: string;
  headline: string;
  intro: string;
  highlights: string[];
};

export const seoLocations: SeoLocation[] = [
  {
    slug: "manila",
    name: "Manila",
    query: "manila",
    region: "Metro Manila",
    title: "Manila Staycations & Vacation Rentals — Condos & Short-Term Stays",
    headline: "Manila Staycations & Vacation Rentals",
    intro:
      "Book affordable staycations, condo rentals, and short-term stays in Manila. Browse furnished condos for short stays, family and couple staycations, and private vacation homes across Metro Manila — a flexible Airbnb alternative for your next Manila trip.",
    highlights: ["Condo staycations", "Short-term rentals", "Near MOA & NAIA", "Family & couple stays"],
  },
  {
    slug: "makati",
    name: "Makati",
    query: "makati",
    region: "Metro Manila",
    title: "Makati Staycations & Condo Rentals — Short-Term Stays",
    headline: "Makati Staycations & Condo Rentals",
    intro:
      "Find furnished Makati condo staycations, apartment rentals, and short-term stays in the heart of the business district. Affordable weekend staycations and private vacation rentals close to malls, offices, and nightlife.",
    highlights: ["Furnished condos", "Weekend staycations", "Near CBD", "Apartment rentals"],
  },
  {
    slug: "quezon-city",
    name: "Quezon City",
    query: "quezon city",
    region: "Metro Manila",
    title: "Quezon City Staycations & Condo Rentals — Short-Term Stays",
    headline: "Quezon City Staycations & Condo Rentals",
    intro:
      "Discover affordable Quezon City staycations, condo rentals, and short-term stays. Family-friendly staycations and furnished QC condos for weekend getaways and longer stays across the metro's largest city.",
    highlights: ["QC condo staycations", "Family-friendly", "Short-term rentals", "Affordable stays"],
  },
  {
    slug: "pasay",
    name: "Pasay",
    query: "pasay",
    region: "Metro Manila",
    title: "Pasay & MOA Staycations — Condo Rentals Near the Airport",
    headline: "Pasay & MOA Area Staycations",
    intro:
      "Book Pasay condo staycations and short-term rentals near MOA and NAIA. Convenient short stays near the airport, the bay area, and the Mall of Asia — perfect for travelers and weekend getaways in Metro Manila.",
    highlights: ["Near MOA", "Near NAIA airport", "Condo staycations", "Short airport stays"],
  },
  {
    slug: "tagaytay",
    name: "Tagaytay",
    query: "tagaytay",
    region: "Cavite",
    title: "Tagaytay Staycations & Vacation Rentals — Pools & Views",
    headline: "Tagaytay Staycations & Vacation Rentals",
    intro:
      "Escape to Tagaytay staycations and vacation rentals with views, private pools, and cool weather. Family-friendly staycations, private villas, and houses for rent for couples and weekend getaways near Taal.",
    highlights: ["Staycations with a view", "Private pool rentals", "Couple & family stays", "Weekend getaways"],
  },
  {
    slug: "batangas",
    name: "Batangas",
    query: "batangas",
    region: "Batangas",
    title: "Batangas Private Resorts & Beach Vacation Rentals With Pools",
    headline: "Batangas Private Resorts & Beach Rentals",
    intro:
      "Rent private resorts, beach houses, and vacation rentals with pools in Batangas. Family resort rentals and private pool getaways for weekends by the beach — book your Batangas staycation with StayPrime.",
    highlights: ["Private pool rentals", "Private resorts", "Beach houses", "Family weekend getaways"],
  },
  {
    slug: "baguio",
    name: "Baguio",
    query: "baguio",
    region: "Benguet",
    title: "Baguio Staycations, Transient Houses & Vacation Rentals",
    headline: "Baguio Staycations & Transient Houses",
    intro:
      "Find affordable Baguio staycations, transient houses, and vacation rentals for short stays in the City of Pines. Family-friendly homes and apartment rentals for cool-weather weekend getaways.",
    highlights: ["Transient houses", "Affordable staycations", "Family stays", "Apartment rentals"],
  },
  {
    slug: "cebu",
    name: "Cebu",
    query: "cebu",
    region: "Cebu",
    title: "Cebu Vacation Rentals, Condos & Beach Staycations",
    headline: "Cebu Vacation Rentals & Staycations",
    intro:
      "Browse Cebu vacation rentals, condo rentals, and beach staycations for short-term stays. Furnished apartments and affordable staycations across Cebu City and nearby beaches — your flexible Airbnb alternative.",
    highlights: ["Condo rentals", "Beach staycations", "Furnished rentals", "Short-term stays"],
  },
  {
    slug: "boracay",
    name: "Boracay",
    query: "boracay",
    region: "Aklan",
    title: "Boracay Vacation Rentals, Villas & Beach House Stays",
    headline: "Boracay Vacation Rentals & Villas",
    intro:
      "Book Boracay vacation rentals, private villas, apartment rentals, and beach house stays steps from White Beach. Short-term rentals for families, couples, and groups on the Philippines' top island.",
    highlights: ["Private villas", "Beach house rentals", "Family & group stays", "Near White Beach"],
  },
  {
    slug: "davao",
    name: "Davao",
    query: "davao",
    region: "Davao del Sur",
    title: "Davao Staycations, Condos & Vacation Rentals — Short-Term Stays",
    headline: "Davao Staycations & Vacation Rentals",
    intro:
      "Find affordable Davao staycations, condo rentals, and short-term stays in Davao City. Furnished condos, family-friendly homes, and private vacation rentals with pools — book your Davao getaway with StayPrime.",
    highlights: ["Condo staycations", "Affordable stays", "Family-friendly", "Vacation rentals with pool"],
  },
];

export const seoLocationBySlug = new Map(seoLocations.map((location) => [location.slug, location]));
