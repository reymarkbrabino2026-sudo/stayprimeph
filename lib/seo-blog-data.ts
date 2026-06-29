export type SeoBlogCategory = "National" | "Near me" | "Luzon" | "Visayas" | "Mindanao" | "Local search";

export type SeoBlogLink = {
  label: string;
  href: string;
};

export type SeoBlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

export type SeoBlogArticle = {
  slug: string;
  keyword: string;
  title: string;
  excerpt: string;
  category: SeoBlogCategory;
  date: string;
  readMinutes: number;
  image: {
    src: string;
    alt: string;
    title: string;
  };
  listingHref: string;
  internalLinks: SeoBlogLink[];
  externalLinks: SeoBlogLink[];
  body: SeoBlogBlock[];
};

type KeywordSeed = {
  keyword: string;
  category: SeoBlogCategory;
  location?: string;
  region?: string;
  listingHref?: string;
  staycationHref?: string;
  propertyType?: string;
  audience?: string;
  image?: string;
};

const dotLink: SeoBlogLink = {
  label: "Philippine Department of Tourism destination information",
  href: "https://www.tourism.gov.ph/",
};

const psaTourismLink: SeoBlogLink = {
  label: "Philippine Statistics Authority tourism releases",
  href: "https://psa.gov.ph/statistics/tourism",
};

const googleLocalLink: SeoBlogLink = {
  label: "Google guide to local search ranking",
  href: "https://support.google.com/business/answer/7091?hl=en",
};

const googleSeoLink: SeoBlogLink = {
  label: "Google Search Central SEO Starter Guide",
  href: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
};

const keywordSeeds: KeywordSeed[] = [
  { keyword: "staycation Philippines", category: "National", listingHref: "/search", audience: "weekend breaks, family trips, and quick city escapes" },
  { keyword: "vacation rentals Philippines", category: "National", listingHref: "/search", audience: "families, couples, and groups comparing private homes" },
  { keyword: "short term rentals Philippines", category: "National", listingHref: "/search", audience: "travelers who need flexible nightly, weekly, or monthly stays" },
  { keyword: "affordable staycation Philippines", category: "National", listingHref: "/search", audience: "budget-conscious travelers planning a practical getaway" },
  { keyword: "condo staycation Philippines", category: "National", listingHref: "/search?type=condo", propertyType: "condo" },
  { keyword: "private resort for rent Philippines", category: "National", listingHref: "/search?type=resort", propertyType: "resort" },
  { keyword: "private pool staycation Philippines", category: "National", listingHref: "/search?amenities=Pool", audience: "families and groups who want a pool without sharing the space" },
  { keyword: "places to stay in the Philippines", category: "National", listingHref: "/search", audience: "travelers comparing cities, beaches, and cooler mountain destinations" },
  { keyword: "family staycation Philippines", category: "National", listingHref: "/search?guests=4", audience: "parents and relatives planning a comfortable group stay" },
  { keyword: "couple staycation Philippines", category: "National", listingHref: "/search?guests=2", audience: "couples looking for privacy, views, and easy check-in" },
  { keyword: "group staycation Philippines", category: "National", listingHref: "/search?guests=10", audience: "friends, reunions, and barkada trips" },
  { keyword: "beach house rental Philippines", category: "National", listingHref: "/search?type=house", propertyType: "beach house", image: "/hero/palawan-beach.jpg" },
  { keyword: "transient house Philippines", category: "National", listingHref: "/search?type=house", propertyType: "transient house" },
  { keyword: "furnished condo for short stay Philippines", category: "National", listingHref: "/search?type=condo", propertyType: "furnished condo" },
  { keyword: "Airbnb alternative Philippines", category: "National", listingHref: "/search", audience: "guests and hosts who want a local short-term rental marketplace" },

  { keyword: "staycation near me", category: "Near me", listingHref: "/search", audience: "travelers searching from their phone for nearby homes" },
  { keyword: "vacation rental near me", category: "Near me", listingHref: "/search", audience: "travelers comparing private homes close to their current area" },
  { keyword: "private resort near me", category: "Near me", listingHref: "/search?type=resort", propertyType: "private resort" },
  { keyword: "private pool near me", category: "Near me", listingHref: "/search?amenities=Pool", audience: "guests who want a nearby pool stay" },
  { keyword: "condo staycation near me", category: "Near me", listingHref: "/search?type=condo", propertyType: "condo" },
  { keyword: "affordable staycation near me", category: "Near me", listingHref: "/search", audience: "guests comparing nearby stays by price" },
  { keyword: "places to stay near me", category: "Near me", listingHref: "/search", audience: "travelers looking for quick overnight options" },
  { keyword: "rooms for overnight near me", category: "Near me", listingHref: "/search", audience: "same-day and overnight guests" },
  { keyword: "transient house near me", category: "Near me", listingHref: "/search?type=house", propertyType: "transient house" },
  { keyword: "beach resort near me", category: "Near me", listingHref: "/search?type=resort", propertyType: "beach resort", image: "/hero/palawan-beach.jpg" },
  { keyword: "pet friendly staycation near me", category: "Near me", listingHref: "/search?amenities=Pet%20friendly", audience: "guests bringing pets" },
  { keyword: "family resort near me", category: "Near me", listingHref: "/search?type=resort&guests=4", propertyType: "family resort" },
  { keyword: "couple staycation near me", category: "Near me", listingHref: "/search?guests=2", audience: "couples planning a nearby break" },
  { keyword: "staycation with pool near me", category: "Near me", listingHref: "/search?amenities=Pool", audience: "guests who want nearby pool access" },

  { keyword: "Manila staycation", category: "Luzon", location: "Manila", region: "Metro Manila", listingHref: "/search?location=Manila", staycationHref: "/staycation/manila" },
  { keyword: "Makati condo staycation", category: "Luzon", location: "Makati", region: "Metro Manila", listingHref: "/search?location=Makati&type=condo", staycationHref: "/staycation/makati", propertyType: "condo" },
  { keyword: "BGC staycation", category: "Luzon", location: "BGC", region: "Metro Manila", listingHref: "/search?location=BGC" },
  { keyword: "Quezon City staycation", category: "Luzon", location: "Quezon City", region: "Metro Manila", listingHref: "/search?location=Quezon%20City", staycationHref: "/staycation/quezon-city" },
  { keyword: "Pasay staycation near MOA", category: "Luzon", location: "Pasay", region: "Metro Manila", listingHref: "/search?location=Pasay", staycationHref: "/staycation/pasay" },
  { keyword: "Paranaque staycation near NAIA", category: "Luzon", location: "Paranaque", region: "Metro Manila", listingHref: "/search?location=Paranaque" },
  { keyword: "Tagaytay staycation", category: "Luzon", location: "Tagaytay", region: "Cavite", listingHref: "/search?location=Tagaytay", staycationHref: "/staycation/tagaytay", image: "/hero/baguio-mountains.jpg" },
  { keyword: "Batangas private resort", category: "Luzon", location: "Batangas", region: "Batangas", listingHref: "/search?location=Batangas&type=resort", staycationHref: "/staycation/batangas", propertyType: "private resort", image: "/hero/palawan-beach.jpg" },
  { keyword: "Baguio transient house", category: "Luzon", location: "Baguio", region: "Benguet", listingHref: "/search?location=Baguio&type=house", staycationHref: "/staycation/baguio", propertyType: "transient house", image: "/hero/baguio-mountains.jpg" },
  { keyword: "La Union beach house rental", category: "Luzon", location: "La Union", region: "Ilocos Region", listingHref: "/search?location=La%20Union&type=house", propertyType: "beach house", image: "/hero/palawan-beach.jpg" },
  { keyword: "Subic vacation rental", category: "Luzon", location: "Subic", region: "Zambales", listingHref: "/search?location=Subic", image: "/hero/palawan-beach.jpg" },
  { keyword: "Clark Pampanga staycation", category: "Luzon", location: "Clark", region: "Pampanga", listingHref: "/search?location=Clark" },
  { keyword: "Zambales beach resort", category: "Luzon", location: "Zambales", region: "Central Luzon", listingHref: "/search?location=Zambales&type=resort", propertyType: "beach resort", image: "/hero/palawan-beach.jpg" },
  { keyword: "Palawan vacation rental", category: "Luzon", location: "Palawan", region: "Mimaropa", listingHref: "/search?location=Palawan", image: "/hero/palawan-lagoon.jpg" },
  { keyword: "Coron vacation rental", category: "Luzon", location: "Coron", region: "Palawan", listingHref: "/search?location=Coron", image: "/hero/palawan-lagoon.jpg" },
  { keyword: "El Nido private villa", category: "Luzon", location: "El Nido", region: "Palawan", listingHref: "/search?location=El%20Nido&type=villa", propertyType: "private villa", image: "/hero/palawan-lagoon.jpg" },

  { keyword: "Cebu vacation rentals", category: "Visayas", location: "Cebu", region: "Central Visayas", listingHref: "/search?location=Cebu", staycationHref: "/staycation/cebu" },
  { keyword: "Cebu City condo staycation", category: "Visayas", location: "Cebu City", region: "Cebu", listingHref: "/search?location=Cebu%20City&type=condo", staycationHref: "/staycation/cebu", propertyType: "condo" },
  { keyword: "Mactan villa rental", category: "Visayas", location: "Mactan", region: "Cebu", listingHref: "/search?location=Mactan&type=villa", propertyType: "villa", image: "/hero/palawan-beach.jpg" },
  { keyword: "Bohol vacation rental", category: "Visayas", location: "Bohol", region: "Central Visayas", listingHref: "/search?location=Bohol", image: "/hero/palawan-beach.jpg" },
  { keyword: "Panglao beach house", category: "Visayas", location: "Panglao", region: "Bohol", listingHref: "/search?location=Panglao&type=house", propertyType: "beach house", image: "/hero/palawan-beach.jpg" },
  { keyword: "Boracay vacation rental", category: "Visayas", location: "Boracay", region: "Aklan", listingHref: "/search?location=Boracay", staycationHref: "/staycation/boracay", image: "/hero/palawan-beach.jpg" },
  { keyword: "Iloilo staycation", category: "Visayas", location: "Iloilo", region: "Western Visayas", listingHref: "/search?location=Iloilo" },
  { keyword: "Bacolod condo rental", category: "Visayas", location: "Bacolod", region: "Negros Island Region", listingHref: "/search?location=Bacolod&type=condo", propertyType: "condo" },
  { keyword: "Dumaguete apartment rental", category: "Visayas", location: "Dumaguete", region: "Negros Oriental", listingHref: "/search?location=Dumaguete&type=apartment", propertyType: "apartment" },
  { keyword: "Siquijor beach stay", category: "Visayas", location: "Siquijor", region: "Central Visayas", listingHref: "/search?location=Siquijor", image: "/hero/palawan-beach.jpg" },

  { keyword: "Davao staycation", category: "Mindanao", location: "Davao", region: "Davao Region", listingHref: "/search?location=Davao", staycationHref: "/staycation/davao" },
  { keyword: "Davao condo rental", category: "Mindanao", location: "Davao", region: "Davao Region", listingHref: "/search?location=Davao&type=condo", staycationHref: "/staycation/davao", propertyType: "condo" },
  { keyword: "Samal island resort rental", category: "Mindanao", location: "Samal Island", region: "Davao del Norte", listingHref: "/search?location=Samal&type=resort", propertyType: "resort", image: "/hero/palawan-beach.jpg" },
  { keyword: "Cagayan de Oro staycation", category: "Mindanao", location: "Cagayan de Oro", region: "Northern Mindanao", listingHref: "/search?location=Cagayan%20de%20Oro" },
  { keyword: "Bukidnon cabin rental", category: "Mindanao", location: "Bukidnon", region: "Northern Mindanao", listingHref: "/search?location=Bukidnon&type=cabin", propertyType: "cabin", image: "/hero/baguio-mountains.jpg" },
  { keyword: "Camiguin vacation rental", category: "Mindanao", location: "Camiguin", region: "Northern Mindanao", listingHref: "/search?location=Camiguin", image: "/hero/palawan-beach.jpg" },
  { keyword: "Siargao villa rental", category: "Mindanao", location: "Siargao", region: "Surigao del Norte", listingHref: "/search?location=Siargao&type=villa", propertyType: "villa", image: "/hero/palawan-beach.jpg" },
  { keyword: "General Santos house rental", category: "Mindanao", location: "General Santos", region: "Soccsksargen", listingHref: "/search?location=General%20Santos&type=house", propertyType: "house" },
  { keyword: "Zamboanga apartment rental", category: "Mindanao", location: "Zamboanga", region: "Zamboanga Peninsula", listingHref: "/search?location=Zamboanga&type=apartment", propertyType: "apartment" },
  { keyword: "Butuan monthly rental", category: "Mindanao", location: "Butuan", region: "Caraga", listingHref: "/search?location=Butuan", audience: "travelers planning longer stays in Caraga" },

  { keyword: "murang staycation", category: "Local search", listingHref: "/search", audience: "local travelers looking for affordable stays" },
  { keyword: "murang private resort", category: "Local search", listingHref: "/search?type=resort", propertyType: "private resort" },
  { keyword: "staycation na may pool", category: "Local search", listingHref: "/search?amenities=Pool", audience: "guests who want a stay with pool access" },
  { keyword: "private resort good for family", category: "Local search", listingHref: "/search?type=resort&guests=4", propertyType: "family private resort" },
  { keyword: "staycation good for 2", category: "Local search", listingHref: "/search?guests=2", audience: "couples and two-person trips" },
  { keyword: "staycation good for 10 pax", category: "Local search", listingHref: "/search?guests=10", audience: "barkada and family groups" },
  { keyword: "overnight staycation", category: "Local search", listingHref: "/search", audience: "guests planning a one-night break" },
  { keyword: "pwedeng magluto staycation", category: "Local search", listingHref: "/search?amenities=Kitchen", audience: "guests who need a kitchen for meals" },
  { keyword: "pet friendly staycation", category: "Local search", listingHref: "/search?amenities=Pet%20friendly", audience: "guests bringing pets" },
  { keyword: "bahay bakasyunan for rent", category: "Local search", listingHref: "/search?type=house", propertyType: "vacation house" },
  { keyword: "condo for rent overnight", category: "Local search", listingHref: "/search?type=condo", propertyType: "condo" },
  { keyword: "transient room for rent", category: "Local search", listingHref: "/search", propertyType: "transient room" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  const acronyms = new Map([
    ["bgc", "BGC"],
    ["moa", "MOA"],
    ["naia", "NAIA"],
    ["ph", "PH"],
    ["airbnb", "Airbnb"],
  ]);

  return value
    .split(" ")
    .map((word) => acronyms.get(word.toLowerCase()) ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

const blogImages = {
  apartmentInterior: "/blog/generated-furnished-condo-interior.png",
  beach: "/blog/generated-philippine-beach-house.png",
  cityResortNight: "/blog/generated-city-condo-staycation.png",
  citySkyline: "/blog/generated-city-condo-staycation.png",
  drivewayResort: "/blog/generated-family-group-villa.png",
  familyVilla: "/blog/generated-family-group-villa.png",
  gardenVilla: "/blog/generated-pet-friendly-garden.png",
  lagoon: "/blog/generated-philippine-beach-house.png",
  mountainDay: "/blog/generated-mountain-cabin-staycation.png",
  mountainNight: "/blog/generated-mountain-cabin-staycation.png",
  resortPool: "/blog/generated-private-resort-pool.png",
  resortWalkway: "/blog/generated-private-resort-pool.png",
  suburbanVilla: "/blog/generated-affordable-local-home.png",
  townhomeNight: "/blog/generated-affordable-local-home.png",
  tropicalGarden: "/blog/generated-pet-friendly-garden.png",
  waterfrontNight: "/blog/generated-city-condo-staycation.png",
} as const;

const imageByKeyword = new Map<string, string>([
  ["staycation Philippines", blogImages.familyVilla],
  ["vacation rentals Philippines", blogImages.suburbanVilla],
  ["short term rentals Philippines", blogImages.apartmentInterior],
  ["affordable staycation Philippines", blogImages.townhomeNight],
  ["condo staycation Philippines", blogImages.cityResortNight],
  ["private resort for rent Philippines", blogImages.resortPool],
  ["private pool staycation Philippines", blogImages.resortPool],
  ["places to stay in the Philippines", blogImages.lagoon],
  ["family staycation Philippines", blogImages.familyVilla],
  ["couple staycation Philippines", blogImages.waterfrontNight],
  ["group staycation Philippines", blogImages.drivewayResort],
  ["beach house rental Philippines", blogImages.beach],
  ["transient house Philippines", blogImages.suburbanVilla],
  ["furnished condo for short stay Philippines", blogImages.apartmentInterior],
  ["Airbnb alternative Philippines", blogImages.resortWalkway],

  ["staycation near me", blogImages.townhomeNight],
  ["vacation rental near me", blogImages.suburbanVilla],
  ["private resort near me", blogImages.resortPool],
  ["private pool near me", blogImages.resortPool],
  ["condo staycation near me", blogImages.cityResortNight],
  ["affordable staycation near me", blogImages.townhomeNight],
  ["places to stay near me", blogImages.citySkyline],
  ["rooms for overnight near me", blogImages.apartmentInterior],
  ["transient house near me", blogImages.suburbanVilla],
  ["beach resort near me", blogImages.beach],
  ["pet friendly staycation near me", blogImages.tropicalGarden],
  ["family resort near me", blogImages.drivewayResort],
  ["couple staycation near me", blogImages.waterfrontNight],
  ["staycation with pool near me", blogImages.resortPool],

  ["Manila staycation", blogImages.citySkyline],
  ["Makati condo staycation", blogImages.cityResortNight],
  ["BGC staycation", blogImages.citySkyline],
  ["Quezon City staycation", blogImages.cityResortNight],
  ["Pasay staycation near MOA", blogImages.citySkyline],
  ["Paranaque staycation near NAIA", blogImages.cityResortNight],
  ["Tagaytay staycation", blogImages.mountainDay],
  ["Batangas private resort", blogImages.resortPool],
  ["Baguio transient house", blogImages.mountainNight],
  ["La Union beach house rental", blogImages.beach],
  ["Subic vacation rental", blogImages.beach],
  ["Clark Pampanga staycation", blogImages.cityResortNight],
  ["Zambales beach resort", blogImages.beach],
  ["Palawan vacation rental", blogImages.lagoon],
  ["Coron vacation rental", blogImages.lagoon],
  ["El Nido private villa", blogImages.lagoon],

  ["Cebu vacation rentals", blogImages.beach],
  ["Cebu City condo staycation", blogImages.cityResortNight],
  ["Mactan villa rental", blogImages.resortPool],
  ["Bohol vacation rental", blogImages.beach],
  ["Panglao beach house", blogImages.beach],
  ["Boracay vacation rental", blogImages.beach],
  ["Iloilo staycation", blogImages.citySkyline],
  ["Bacolod condo rental", blogImages.apartmentInterior],
  ["Dumaguete apartment rental", blogImages.apartmentInterior],
  ["Siquijor beach stay", blogImages.beach],

  ["Davao staycation", blogImages.citySkyline],
  ["Davao condo rental", blogImages.cityResortNight],
  ["Samal island resort rental", blogImages.beach],
  ["Cagayan de Oro staycation", blogImages.citySkyline],
  ["Bukidnon cabin rental", blogImages.mountainDay],
  ["Camiguin vacation rental", blogImages.beach],
  ["Siargao villa rental", blogImages.beach],
  ["General Santos house rental", blogImages.suburbanVilla],
  ["Zamboanga apartment rental", blogImages.apartmentInterior],
  ["Butuan monthly rental", blogImages.apartmentInterior],

  ["murang staycation", blogImages.townhomeNight],
  ["murang private resort", blogImages.resortPool],
  ["staycation na may pool", blogImages.resortPool],
  ["private resort good for family", blogImages.drivewayResort],
  ["staycation good for 2", blogImages.waterfrontNight],
  ["staycation good for 10 pax", blogImages.drivewayResort],
  ["overnight staycation", blogImages.townhomeNight],
  ["pwedeng magluto staycation", blogImages.apartmentInterior],
  ["pet friendly staycation", blogImages.tropicalGarden],
  ["bahay bakasyunan for rent", blogImages.suburbanVilla],
  ["condo for rent overnight", blogImages.cityResortNight],
  ["transient room for rent", blogImages.apartmentInterior],
]);

function defaultImage(seed: KeywordSeed) {
  const exactImage = imageByKeyword.get(seed.keyword);
  if (exactImage) return exactImage;
  if (seed.image) return seed.image;

  const text = `${seed.keyword} ${seed.location ?? ""}`.toLowerCase();
  if (text.includes("beach") || text.includes("boracay") || text.includes("palawan") || text.includes("coron") || text.includes("el nido") || text.includes("siargao") || text.includes("camiguin") || text.includes("samal")) return "/hero/palawan-beach.jpg";
  if (text.includes("baguio") || text.includes("tagaytay") || text.includes("bukidnon") || text.includes("cabin")) return "/hero/baguio-mountains.jpg";
  if (text.includes("condo") || text.includes("city") || text.includes("manila") || text.includes("makati") || text.includes("bgc")) return blogImages.cityResortNight;
  if (text.includes("pool") || text.includes("resort")) return blogImages.resortPool;
  if (text.includes("apartment") || text.includes("room") || text.includes("monthly")) return blogImages.apartmentInterior;
  return blogImages.familyVilla;
}

function articleTitle(seed: KeywordSeed) {
  const keyword = titleCase(seed.keyword);
  if (seed.category === "Near me") return `${keyword}: How to Find Nearby Stays`;
  if (seed.category === "Local search") return `${keyword}: Local Stay Guide`;
  if (seed.location) return `${keyword}: Where to Stay and What to Check`;
  return `${keyword}: StayPrime PH Guide`;
}

function excerptFor(seed: KeywordSeed) {
  if (seed.location) {
    return `Plan a ${seed.keyword} trip with practical booking tips, stay ideas, and direct links to StayPrime PH listings in ${seed.location}.`;
  }
  if (seed.category === "Near me") {
    return `Use this guide to compare ${seed.keyword} searches, nearby stay options, must-check amenities, and StayPrime PH listing links.`;
  }
  return `A practical StayPrime PH guide for ${seed.keyword}, including what travelers compare first and where to browse matching listings.`;
}

function scopeLabel(seed: KeywordSeed) {
  if (seed.location && seed.region) return `${seed.location}, ${seed.region}`;
  if (seed.location) return seed.location;
  if (seed.category === "Near me") return "your current area";
  if (seed.category === "Local search") return "local Philippine trips";
  return "the Philippines";
}

function tripAudience(seed: KeywordSeed) {
  if (seed.audience) return seed.audience;
  if (seed.propertyType) return `travelers comparing ${seed.propertyType} stays`;
  if (seed.location) return `travelers planning a stay in ${seed.location}`;
  return "travelers comparing private stays, condos, homes, and resorts";
}

function externalLinksFor(seed: KeywordSeed): SeoBlogLink[] {
  if (seed.category === "Near me") return [googleLocalLink, googleSeoLink];
  if (seed.category === "Local search") return [dotLink, googleSeoLink];
  return [dotLink, psaTourismLink];
}

function bodyFor(seed: KeywordSeed): SeoBlogBlock[] {
  const scope = scopeLabel(seed);
  const audience = tripAudience(seed);
  const keyword = seed.keyword;
  const placePhrase = seed.location ? ` in ${seed.location}` : seed.category === "Near me" ? " nearby" : " across the Philippines";
  const propertyPhrase = seed.propertyType ?? "stay";

  return [
    {
      type: "p",
      text: `${titleCase(keyword)} is a high-intent search because the traveler is usually close to choosing a place, a date, or a budget. This guide keeps the page useful for guests while giving search engines clear context about ${scope}, StayPrime PH listings, and the kind of stay being compared.`,
    },
    {
      type: "h2",
      text: `Why travelers search for ${keyword}`,
    },
    {
      type: "p",
      text: `Most people using this keyword want practical answers: where the stay is located, how many guests it fits, whether the price is reasonable, and whether the property has the amenities they need. For ${audience}, the fastest path is to compare real listing details instead of reading generic travel copy.`,
    },
    {
      type: "h3",
      text: "Search intent",
    },
    {
      type: "ul",
      items: [
        `Find available ${propertyPhrase} options${placePhrase}.`,
        "Compare nightly price, total stay cost, guest capacity, and photos.",
        "Check essentials such as Wi-Fi, parking, kitchen access, pool access, pet rules, and house rules.",
      ],
    },
    {
      type: "h3",
      text: "Best fit",
    },
    {
      type: "p",
      text: `This search is strongest for guests who already know the experience they want but still need a trustworthy booking path. StayPrime PH pages should answer that intent quickly and then move the visitor into listings where they can filter and book.`,
    },
    {
      type: "h2",
      text: "What to check before booking",
    },
    {
      type: "h3",
      text: "Location and access",
    },
    {
      type: "p",
      text: seed.location
        ? `For ${seed.location}, check the exact neighborhood, travel time to landmarks, parking situation, and whether the property works for late arrivals or early check-in requests.`
        : "For national and near-me searches, check the exact map area first. A good price can still feel inconvenient if the stay is far from your event, airport, beach, mall, or family destination.",
    },
    {
      type: "h3",
      text: "Space, amenities, and rules",
    },
    {
      type: "ul",
      items: [
        "Match guest capacity to the actual sleeping setup, not just the maximum headcount.",
        "Confirm kitchen, pool, parking, Wi-Fi, air-conditioning, and pet-friendly details before paying.",
        "Read house rules for quiet hours, visitors, cooking, smoking, and check-in requirements.",
      ],
    },
    {
      type: "h2",
      text: "How StayPrime PH should use this keyword",
    },
    {
      type: "h3",
      text: "Page content",
    },
    {
      type: "p",
      text: `Use the exact phrase "${keyword}" naturally in the title, H1, intro, image title, image alt text, and one or two headings. The page should also mention related traveler phrases such as affordable stays, private homes, condos, vacation rentals, short-term stays, and places to stay near me where they make sense.`,
    },
    {
      type: "h3",
      text: "Listing path",
    },
    {
      type: "p",
      text: `The main call to action should send the visitor to matching StayPrime PH listings. That gives the blog page SEO value while still helping guests reach the booking inventory quickly.`,
    },
  ];
}

function internalLinksFor(seed: KeywordSeed): SeoBlogLink[] {
  const links: SeoBlogLink[] = [
    { label: `View ${seed.keyword} listings`, href: seed.listingHref ?? "/search" },
    { label: "Browse all StayPrime PH stays", href: "/search" },
  ];

  if (seed.staycationHref) {
    links.push({ label: `${seed.location} staycation guide`, href: seed.staycationHref });
  }

  links.push({ label: "Read why StayPrime PH is a local Airbnb alternative", href: "/newsroom/airbnb-alternative-philippines-staycations" });
  return links;
}

function buildArticle(seed: KeywordSeed, index: number): SeoBlogArticle {
  const title = articleTitle(seed);
  const image = defaultImage(seed);
  const date = new Date(Date.UTC(2026, 5, 28 - (index % 20))).toISOString().slice(0, 10);

  return {
    slug: slugify(seed.keyword),
    keyword: seed.keyword,
    title,
    excerpt: excerptFor(seed),
    category: seed.category,
    date,
    readMinutes: 4,
    image: {
      src: image,
      alt: `${titleCase(seed.keyword)} guide by StayPrime PH`,
      title: `${titleCase(seed.keyword)} listings and travel guide`,
    },
    listingHref: seed.listingHref ?? "/search",
    internalLinks: internalLinksFor(seed),
    externalLinks: externalLinksFor(seed),
    body: bodyFor(seed),
  };
}

export const seoBlogArticles: SeoBlogArticle[] = keywordSeeds.map(buildArticle);

export const seoBlogCategories: SeoBlogCategory[] = ["National", "Near me", "Luzon", "Visayas", "Mindanao", "Local search"];

export function getSeoBlogBySlug(slug: string) {
  return seoBlogArticles.find((article) => article.slug === slug);
}

export function getSortedSeoBlogs() {
  return [...seoBlogArticles].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
