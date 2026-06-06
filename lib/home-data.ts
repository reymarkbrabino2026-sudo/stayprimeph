export type HomeRailItem = [string, string, string, string, number];

export const homeRails: { title: string; items: HomeRailItem[] }[] = [
  {
    title: "Popular homes in Legarda-Burnham-Kisad",
    items: [
      ["Condo in Baguio", "â‚±13,010 for 2 nights", "4.88", "Superhost", 164],
      ["Home in Baguio", "â‚±6,830 for 2 nights", "4.95", "Guest favorite", 175],
      ["Tiny home in Baguio", "â‚±3,893 for 2 nights", "4.92", "Guest favorite", 188],
      ["Condo in Baguio", "â‚±8,125 for 2 nights", "4.93", "Guest favorite", 201],
      ["Place to stay in Baguio", "â‚±3,081 for 2 nights", "5.0", "Guest favorite", 219],
      ["Apartment in Baguio", "â‚±10,267 for 2 nights", "5.0", "Guest favorite", 227],
      ["Apartment in Baguio", "â‚±8,911 for 2 nights", "4.79", "Guest favorite", 238],
    ],
  },
  {
    title: "Stay in Barangay 76",
    items: [
      ["Apartment in Pasay", "â‚±9,100 for 2 nights", "4.91", "Guest favorite", 250],
      ["Loft in Pasay", "â‚±8,440 for 2 nights", "4.96", "Superhost", 255],
      ["Condo in Pasay", "â‚±7,520 for 2 nights", "4.89", "Guest favorite", 264],
      ["Studio in Pasay", "â‚±6,230 for 2 nights", "4.93", "Guest favorite", 274],
      ["Home in Pasay", "â‚±10,400 for 2 nights", "5.0", "Superhost", 286],
      ["Apartment in Pasay", "â‚±7,690 for 2 nights", "4.86", "Guest favorite", 292],
      ["Condo in Pasay", "â‚±8,220 for 2 nights", "4.82", "Guest favorite", 299],
    ],
  },
];

export const experienceRail: { title: string; items: HomeRailItem[] } = {
  title: "Popular experiences nearby",
  items: [
    ["Makati Street Food Experience End in a Rooftop Bar", "From â‚±3,500 / guest", "4.91", "Popular", 331],
    ["Discover the Real Manila with Tuktuk and Jeepney", "From â‚±3,500 / guest", "4.95", "Popular", 342],
    ["Explore Intramuros with Local Guide", "From â‚±3,000 / guest", "4.93", "Popular", 350],
    ["Street food tasting tour in Mandaluyong", "From â‚±3,591 / guest", "4.93", "Popular", 363],
    ["Makati: Rooftop, Clubs, Live Music & Street Food", "From â‚±999 / guest", "5.0", "Popular", 377],
    ["Intramuros: Heritage and Food Guided Tour", "From â‚±1,360 / guest", "5.0", "Popular", 390],
    ["Manila Social and Political Walk", "From â‚±2,380 / guest", "4.79", "Popular", 399],
  ],
};

export const futureGetaways = [
  ["Davao City", "Vacation rentals"],
  ["General Santos", "House rentals"],
  ["Zamboanga City", "Apartment rentals"],
  ["Cagayan de Oro", "Condo rentals"],
  ["Butuan", "Monthly rentals"],
  ["Iligan", "Vacation rentals"],
  ["Cebu City", "Condo rentals"],
  ["Lapu-Lapu City", "Villa rentals"],
  ["Dumaguete", "Apartment rentals"],
  ["Iloilo City", "House rentals"],
  ["Bacolod", "Condo rentals"],
  ["Tacloban", "Monthly rentals"],
  ["Manila", "Apartment rentals"],
  ["Makati", "Condo rentals"],
  ["Tagaytay", "Vacation rentals"],
  ["Baguio", "Cabin rentals"],
  ["Vigan", "House rentals"],
  ["Laoag", "Villa rentals"],
];

export const footerColumns = [
  {
    title: "Support",
    links: [
      { label: "Guest support desk", href: "/support/help-center" },
      { label: "Report a stay concern", href: "/support/safety" },
      { label: "Trip assurance", href: "/support/aircover" },
      { label: "Travel protection basics", href: "/support/travel-insurance" },
      { label: "Fair access standards", href: "/support/anti-discrimination" },
      { label: "Accessibility guidance", href: "/support/disability-support" },
      { label: "Change or cancel a trip", href: "/support/cancellation-options" },
      { label: "Safety commitments", href: "/legal/safety-policy" },
      { label: "Trust center", href: "/trust-and-safety" },
    ],
  },
  {
    title: "Hosting",
    links: [
      { label: "List your home", href: "/hosting/stayprimeph-your-home" },
      { label: "Create a local experience", href: "/hosting/stayprimeph-your-experience" },
      { label: "Offer guest services", href: "/hosting/stayprimeph-your-service" },
      { label: "Host protection guide", href: "/hosting/aircover-for-hosts" },
      { label: "Host learning hub", href: "/hosting/resources" },
      { label: "Host community", href: "/hosting/community-forum" },
      { label: "Responsible hosting", href: "/hosting/responsibly" },
      { label: "Platform terms", href: "/legal/terms" },
      { label: "Cancellation rules", href: "/legal/cancellation-policy" },
    ],
  },
  {
    title: "StayPrimePH",
    links: [
      { label: "Product updates", href: "/company/summer-release" },
      { label: "Stories and announcements", href: "/company/newsroom" },
      { label: "Work with us", href: "/company/careers" },
      { label: "Company information", href: "/company/investors" },
      { label: "Travel credit", href: "/company/gift-cards" },
      { label: "Community stay relief", href: "/company/emergency-stays" },
      { label: "Privacy notice", href: "/legal/privacy" },
      { label: "Service status", href: "/status" },
    ],
  },
];

export type FooterPage = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: { title: string; body: string }[];
  cta?: { label: string; href: string };
};

export const footerPages: Record<string, Record<string, FooterPage>> = {
  support: {
    "help-center": {
      eyebrow: "Support",
      title: "Guest support desk",
      intro: "Get practical help with reservations, payments, profile settings, and trip updates.",
      sections: [
        { title: "Common requests", body: "Review booking details, update account information, recover access, or send a support note about an upcoming stay." },
        { title: "When timing matters", body: "Use the concern-reporting page for active stay issues so the right review queue receives the details first." },
      ],
      cta: { label: "View your trips", href: "/guest/bookings" },
    },
    safety: {
      eyebrow: "Support",
      title: "Report a stay concern",
      intro: "If a stay feels unsafe or seriously different from what was promised, capture the details and contact the team right away.",
      sections: [
        { title: "During a reservation", body: "If it is safe to do so, message the host, keep photos or screenshots, and contact local emergency services for immediate danger." },
        { title: "Review process", body: "Submitted reports are checked by admins so guest, host, and listing records can be evaluated with context." },
      ],
    },
    aircover: {
      eyebrow: "Support",
      title: "Trip assurance",
      intro: "A clear path for guests when a confirmed stay cannot be accessed or does not match the listing details.",
      sections: [
        { title: "What to expect", body: "Support can help document the issue, contact the host, and review practical next steps for eligible reservation problems." },
        { title: "Helpful evidence", body: "Keep conversation inside StayPrimePH messages and attach clear photos, timestamps, or receipts when filing a report." },
      ],
    },
    "travel-insurance": {
      eyebrow: "Support",
      title: "Travel protection basics",
      intro: "Understand the types of coverage travelers often consider before a trip begins.",
      sections: [
        { title: "Before choosing coverage", body: "Compare covered reasons, claim limits, exclusions, and whether delays, weather, or medical events are included." },
        { title: "Keep records", body: "Save receipts, confirmations, and provider messages so you have the documents needed if a claim comes up." },
      ],
    },
    "anti-discrimination": {
      eyebrow: "Support",
      title: "Fair access standards",
      intro: "StayPrimePH expects guests and hosts to treat one another with dignity, fairness, and respect.",
      sections: [
        { title: "Our standard", body: "Biased treatment based on protected characteristics is not allowed in listings, messages, reviews, or reservation decisions." },
        { title: "How reports are handled", body: "Guests and hosts can submit concerning behavior for admin review, with account actions applied when the record supports it." },
      ],
    },
    "disability-support": {
      eyebrow: "Support",
      title: "Accessibility guidance",
      intro: "Clear accessibility information helps guests decide whether a stay matches their mobility, sensory, or support needs.",
      sections: [
        { title: "For guests", body: "Check the listing, ask specific questions, and confirm any essential feature before booking nonrefundable dates." },
        { title: "For hosts", body: "Describe entrances, bathrooms, paths, parking, and other features precisely, using recent photos whenever possible." },
      ],
    },
    "cancellation-options": {
      eyebrow: "Support",
      title: "Change or cancel a trip",
      intro: "Review the rules for your reservation before changing dates, canceling, or asking a host for an exception.",
      sections: [
        { title: "For guests", body: "Check the policy shown at checkout and in your booking details before making a change request." },
        { title: "For hosts", body: "Choose rules that match your calendar risk, cleaning schedule, and ability to rebook the dates." },
      ],
    },
  },
  hosting: {
    "stayprimeph-your-home": {
      eyebrow: "Hosting",
      title: "List your home",
      intro: "Turn an available room, condo, cabin, or house into a clear listing guests can understand quickly.",
      sections: [
        { title: "How setup works", body: "Add the location, amenities, sleeping details, photos, title, description, price, and house rules in the host wizard." },
        { title: "Before guests see it", body: "New listings go through admin approval, then appear in search once the content and availability are ready." },
      ],
      cta: { label: "Start hosting", href: "/become-a-host/setup" },
    },
    "stayprimeph-your-experience": {
      eyebrow: "Hosting",
      title: "Create a local experience",
      intro: "Shape guided activities that help travelers discover food, culture, nature, or craft through local knowledge.",
      sections: [
        { title: "What to prepare", body: "Define the route or activity, duration, group size, inclusions, safety notes, weather plans, and price." },
        { title: "Availability", body: "Experience publishing is planned as a later module after the stay marketplace is operating smoothly." },
      ],
    },
    "stayprimeph-your-service": {
      eyebrow: "Hosting",
      title: "Offer guest services",
      intro: "Add useful services around a trip, such as airport pickup, stocked kitchens, cleaning, or local coordination.",
      sections: [
        { title: "Best fit", body: "A good service has a clear scope, dependable timing, simple pricing, and enough detail for guests to book confidently." },
        { title: "Roadmap", body: "Service listings are planned for a future release after stays and experience tools are in place." },
      ],
    },
    "aircover-for-hosts": {
      eyebrow: "Hosting",
      title: "Host protection guide",
      intro: "Guidance for reducing preventable issues and keeping a clean record when a reservation needs review.",
      sections: [
        { title: "Protect your listing", body: "Use accurate photos, current house rules, working safety equipment, and simple check-in instructions." },
        { title: "If something happens", body: "Keep communication in messages and submit a report with photos or receipts so admins can review a complete timeline." },
      ],
    },
    resources: {
      eyebrow: "Hosting",
      title: "Host learning hub",
      intro: "Practical guidance for stronger listings, cleaner calendars, useful photos, and better guest communication.",
      sections: [
        { title: "Strong listings", body: "Use a direct title, honest description, accurate map area, complete amenities, and a cover photo that shows the main space." },
        { title: "Healthy operations", body: "Keep availability current, respond promptly, and update pricing when holidays or local events change demand." },
      ],
    },
    "community-forum": {
      eyebrow: "Hosting",
      title: "Host community",
      intro: "A future space for hosts to exchange local advice, listing feedback, and operating lessons.",
      sections: [
        { title: "What belongs here", body: "Photo critiques, pricing questions, guest communication examples, neighborhood notes, and policy discussions." },
        { title: "Why it matters", body: "A marketplace improves faster when hosts can learn from real scenarios instead of guessing alone." },
      ],
    },
    responsibly: {
      eyebrow: "Hosting",
      title: "Responsible hosting",
      intro: "Good hosting balances guest comfort with neighborhood peace, property rules, and local requirements.",
      sections: [
        { title: "Before publishing", body: "Check permits, tax requirements, building rules, safety equipment, and any limits on short-term stays." },
        { title: "During hosting", body: "Set quiet hours, occupancy limits, parking notes, waste instructions, and emergency contacts before guests arrive." },
      ],
    },
  },
  company: {
    "summer-release": {
      eyebrow: "StayPrimePH",
      title: "Product updates",
      intro: "A running summary of improvements to search, booking, listing setup, and marketplace operations.",
      sections: [
        { title: "Recent focus", body: "Cleaner mobile browsing, smoother host onboarding, clearer listing review states, and better account flows." },
        { title: "Why we share updates", body: "Release notes help guests and hosts understand what changed and what is still being built." },
      ],
    },
    newsroom: {
      eyebrow: "StayPrimePH",
      title: "Stories and announcements",
      intro: "Company notes, product milestones, marketplace stories, and updates for the StayPrimePH community.",
      sections: [
        { title: "What we publish", body: "Product launches, trust improvements, host highlights, travel trends, and community milestones can live here." },
        { title: "Press contact", body: "Media contact details will be added when StayPrimePH is ready for public announcements beyond beta." },
      ],
    },
    careers: {
      eyebrow: "StayPrimePH",
      title: "Work with us",
      intro: "Help build thoughtful tools for travelers, hosts, admins, and local communities.",
      sections: [
        { title: "Teams", body: "Future roles may span engineering, design, operations, trust and safety, support, partnerships, and marketplace growth." },
        { title: "How we work", body: "We value careful product thinking, clear communication, reliable systems, and respect for the people affected by each decision." },
      ],
    },
    investors: {
      eyebrow: "StayPrimePH",
      title: "Company information",
      intro: "A concise home for company background, governance notes, and future business updates.",
      sections: [
        { title: "For later stages", body: "This page can eventually include reports, official filings, market updates, and contact information." },
        { title: "Current state", body: "StayPrimePH is still in build mode, so the public company information is intentionally brief for now." },
      ],
    },
    "gift-cards": {
      eyebrow: "StayPrimePH",
      title: "Travel credit",
      intro: "A future way to help someone pay for a stay, weekend break, or family visit.",
      sections: [
        { title: "How it could work", body: "Recipients would redeem a balance at checkout and keep any remaining amount for a later reservation." },
        { title: "Not live yet", body: "Travel credit will launch only after the production payment system and balance tracking are ready." },
      ],
    },
    "emergency-stays": {
      eyebrow: "StayPrimePH",
      title: "Community stay relief",
      intro: "A future initiative for coordinating temporary places to stay during urgent community needs.",
      sections: [
        { title: "Purpose", body: "The goal is to connect available homes with people displaced by emergencies when the platform is ready to support that workflow." },
        { title: "Future work", body: "This would require partner operations, eligibility checks, dedicated policies, and careful host participation tools before launch." },
      ],
    },
  },
};
