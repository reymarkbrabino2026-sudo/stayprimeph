export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type NewsTopic = "Company" | "Stays" | "Hosting" | "Travel";

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO date
  author: string;
  topic: NewsTopic;
  readMinutes: number;
  heroTone: string;
  keyTakeaways: string[];
  body: ArticleBlock[];
};

export const newsTopics: NewsTopic[] = ["Company", "Stays", "Hosting", "Travel"];

export const newsArticles: NewsArticle[] = [
  {
    slug: "best-staycation-spots-near-manila",
    title: "Best staycation spots near Manila for a weekend getaway",
    excerpt:
      "From Tagaytay's cool ridge views to Batangas private pools and Baguio's pine air, here are the best affordable staycation spots a short drive from Manila.",
    date: "2026-06-20",
    author: "StayPrime PH",
    topic: "Travel",
    readMinutes: 5,
    heroTone: "from-emerald-100 via-teal-50 to-sky-100",
    keyTakeaways: [
      "Tagaytay, Batangas, and Baguio are the top weekend staycation escapes near Manila.",
      "Private pool rentals and condo staycations suit both couples and families.",
      "Booking a short-term rental often costs less per head than a hotel for groups.",
    ],
    body: [
      { type: "p", text: "You don't need a long holiday to reset. Some of the best staycation spots in the Philippines are just a couple of hours from Metro Manila, and a private vacation rental gives you the whole space to yourselves — kitchen, pool, and all." },
      { type: "h2", text: "Tagaytay — cool air and ridge views" },
      { type: "p", text: "Tagaytay is the classic weekend staycation near Manila. Book a Tagaytay staycation with a view of Taal, or a private villa with a pool for a couple's getaway. The cool climate and short drive make it perfect for a quick reset." },
      { type: "h2", text: "Batangas — private pools and the beach" },
      { type: "p", text: "For sun and water, Batangas private resorts and beach house rentals are hard to beat. A private pool rental in Batangas is ideal for families and barkada trips where you want the place to yourselves." },
      { type: "h2", text: "Baguio — pine air and transient houses" },
      { type: "p", text: "If you want cool weather year-round, Baguio staycations and transient houses give you an affordable home base for exploring the City of Pines. Look for family-friendly homes with a kitchen so you can cook in." },
      { type: "p", text: "Browse vacation rentals across these destinations on StayPrime to compare prices, amenities, and availability before you book." },
    ],
  },
  {
    slug: "how-to-start-a-staycation-business-philippines",
    title: "How to start a staycation business in the Philippines",
    excerpt:
      "Thinking of renting out your condo or house for short stays? Here's a practical guide to starting a staycation business and earning from short-term rentals in the Philippines.",
    date: "2026-06-16",
    author: "StayPrime PH",
    topic: "Hosting",
    readMinutes: 6,
    heroTone: "from-amber-100 via-orange-50 to-rose-100",
    keyTakeaways: [
      "A spare condo or house can become a short-term rental income stream.",
      "Good photos, fair pricing, and clear house rules win more bookings.",
      "Listing on a platform like StayPrime handles discovery, booking, and payouts for you.",
    ],
    body: [
      { type: "p", text: "Short-term rentals have turned spare condos and family homes into reliable income across the Philippines. If you've been wondering how to start a staycation business, the path is more approachable than most people expect." },
      { type: "h2", text: "1. Prepare your space" },
      { type: "p", text: "Clean, declutter, and add the essentials guests expect — fast Wi-Fi, a stocked kitchen, fresh linens, and reliable air-conditioning. Then take bright, honest photos. Listings with clear photos consistently earn more bookings." },
      { type: "h2", text: "2. Price it right" },
      { type: "p", text: "Research comparable condo staycations and vacation rentals in your area, then set a competitive nightly rate. You can add a weekend premium and discounts for weekly or monthly stays to keep your calendar full." },
      { type: "h2", text: "3. List and start earning" },
      { type: "p", text: "Publish your listing on a property listing platform that handles discovery, bookings, and payouts. On StayPrime, you list your condo or house, set your rules, and we send your earnings to your bank, GCash, or PayPal after each stay." },
      { type: "p", text: "It's a flexible Airbnb alternative for hosts in the Philippines — built for local short-term rentals and staycations." },
    ],
  },
  {
    slug: "airbnb-alternative-philippines-staycations",
    title: "StayPrime PH: a local Airbnb alternative for staycations and short-term rentals",
    excerpt:
      "StayPrime is a Philippine-built marketplace for staycations, vacation rentals, and short-term stays — connecting local guests and hosts directly.",
    date: "2026-06-12",
    author: "StayPrime PH",
    topic: "Company",
    readMinutes: 4,
    heroTone: "from-[#0b5d4e] via-[#0f7a65] to-emerald-300",
    keyTakeaways: [
      "StayPrime focuses on Philippine staycations, vacation rentals, and short-term stays.",
      "Guests book affordable private homes; hosts earn from their property directly.",
      "Local support, peso pricing, and payouts to bank, GCash, or PayPal.",
    ],
    body: [
      { type: "p", text: "StayPrime PH is a vacation rental marketplace built for the Philippines. Whether you're a traveler looking for an affordable staycation or a host wanting to earn from your condo, StayPrime connects you directly — no middlemen, peso pricing, and local support." },
      { type: "h2", text: "For guests" },
      { type: "p", text: "Search vacation rentals, condo staycations, private resorts, and short-term rentals across Manila, Cebu, Davao, Tagaytay, Boracay, and more. Compare prices, amenities, and reviews, then book a private place to stay in just a few taps." },
      { type: "h2", text: "For hosts" },
      { type: "p", text: "List your property in the Philippines and start earning from short-term rentals. StayPrime is a simple property listing platform and Airbnb alternative for hosts — you set your pricing and rules, and we handle discovery, bookings, and payouts." },
      { type: "p", text: "It's short-term rental hosting and staycation booking, made local." },
    ],
  },
  {
    slug: "vacation-rental-vs-hotel-philippines",
    title: "Vacation rental vs hotel: which is better for your Philippine trip?",
    excerpt:
      "Private vacation rentals and hotels each have strengths. Here's how short-term rentals compare on space, price, and privacy for staycations in the Philippines.",
    date: "2026-06-08",
    author: "StayPrime PH",
    topic: "Stays",
    readMinutes: 5,
    heroTone: "from-sky-100 via-cyan-50 to-emerald-50",
    keyTakeaways: [
      "Vacation rentals give more space and privacy — great for families and groups.",
      "A kitchen and laundry can make longer stays cheaper than a hotel.",
      "Hotels win on daily service; rentals win on a home-like experience.",
    ],
    body: [
      { type: "p", text: "When planning a staycation in the Philippines, one of the first choices is a private vacation rental versus a hotel. Both work — but they suit different trips." },
      { type: "h2", text: "Space and privacy" },
      { type: "p", text: "A vacation rental gives you the whole place: separate bedrooms, a living area, and often a private pool. For families and barkada trips, that space and privacy is hard to match in a single hotel room." },
      { type: "h2", text: "Price for groups and long stays" },
      { type: "p", text: "Split across a group, a furnished condo rental or private house often costs less per head than booking multiple hotel rooms. A kitchen and laundry also cut costs on longer or monthly stays." },
      { type: "h2", text: "When a hotel makes sense" },
      { type: "p", text: "Hotels still win when you want daily housekeeping, a front desk, and on-site dining without lifting a finger. For a short solo trip, that convenience can be worth it." },
      { type: "p", text: "For most staycations, weekend getaways, and family trips, a private short-term rental gives you the most value — and a more local, home-like stay." },
    ],
  },
  {
    slug: "how-to-list-your-property-earn-short-term-rentals",
    title: "How to list your property and earn from short-term rentals",
    excerpt:
      "A step-by-step guide to listing your condo, house, or resort on StayPrime and earning from staycations and short-term rentals in the Philippines.",
    date: "2026-06-02",
    author: "StayPrime PH",
    topic: "Hosting",
    readMinutes: 4,
    heroTone: "from-rose-100 via-orange-50 to-stone-100",
    keyTakeaways: [
      "Listing takes minutes: add photos, location, pricing, and house rules.",
      "Listings are reviewed before they go live to keep quality high.",
      "Earnings are sent to your saved bank, GCash, or PayPal after each stay.",
    ],
    body: [
      { type: "p", text: "Turning your property into income is straightforward on StayPrime. Here's how to list your condo, house, or private resort and start earning from short-term rentals." },
      { type: "h2", text: "Step 1 — Create your listing" },
      { type: "p", text: "Add your property details, upload clear photos, set your location on the map, and write a short, honest description of what makes your place special." },
      { type: "h2", text: "Step 2 — Set pricing and rules" },
      { type: "p", text: "Choose your nightly rate, add a weekend price if you like, and set your house rules and guest capacity. You can update pricing any time to stay competitive." },
      { type: "h2", text: "Step 3 — Publish and get booked" },
      { type: "p", text: "Submit for a quick quality review, then go live. Guests can find and book your place, and StayPrime sends your earnings to your saved payout account after each completed stay." },
      { type: "p", text: "Ready to rent out your condo or house? List your property and join StayPrime hosts across the Philippines." },
    ],
  },
];

export function getArticleBySlug(slug: string): NewsArticle | undefined {
  return newsArticles.find((article) => article.slug === slug);
}

export function getSortedArticles(): NewsArticle[] {
  return [...newsArticles].sort((a, b) => b.date.localeCompare(a.date));
}
