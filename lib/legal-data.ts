export type LegalPage = {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: { title: string; body: string[] }[];
};

export const legalPages: LegalPage[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    description: "The baseline terms for using StayPrimePH as a guest, host, or admin-managed marketplace participant.",
    updatedAt: "May 19, 2026",
    sections: [
      {
        title: "Using the platform",
        body: [
          "StayPrimePH is a booking marketplace prototype for discovering, listing, and reserving short-term stays.",
          "Users are responsible for keeping account information accurate and for using the platform lawfully and respectfully.",
        ],
      },
      {
        title: "Bookings and listings",
        body: [
          "Hosts are responsible for truthful listing information, accurate availability, house rules, and safe guest experiences.",
          "Guests are responsible for reviewing listing details, respecting house rules, and completing payments through approved checkout flows.",
        ],
      },
      {
        title: "Important note",
        body: [
          "This page is product-ready placeholder copy and must be reviewed by a qualified legal professional before public launch.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How StayPrimePH plans to handle account, listing, booking, payment, and messaging data.",
    updatedAt: "May 19, 2026",
    sections: [
      {
        title: "Information we collect",
        body: [
          "The platform may collect account details, profile information, listing content, booking records, messages, payment references, and support reports.",
          "Sensitive payment details should be handled by payment providers such as Stripe rather than stored directly in the application database.",
        ],
      },
      {
        title: "How information is used",
        body: [
          "Data is used to provide search, booking, host management, admin moderation, safety review, fraud prevention, and customer support.",
          "Operational integrations such as email, analytics, error tracking, storage, and rate limiting should only receive the minimum information needed.",
        ],
      },
      {
        title: "Important note",
        body: [
          "This page is product-ready placeholder copy and must be reviewed by a qualified privacy/legal professional before public launch.",
        ],
      },
    ],
  },
  {
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    description: "A clear baseline for guest cancellations, host cancellations, refunds, and booking status changes.",
    updatedAt: "May 19, 2026",
    sections: [
      {
        title: "Guest cancellations",
        body: [
          "Guests should review the cancellation terms shown during checkout before confirming a booking.",
          "Refund eligibility depends on the listing policy, booking status, payment status, and timing of the cancellation request.",
        ],
      },
      {
        title: "Host cancellations",
        body: [
          "Hosts should avoid cancelling confirmed stays unless there is a legitimate safety, emergency, or availability issue.",
          "Admin review may be required when cancellations create guest harm or repeated reliability problems.",
        ],
      },
      {
        title: "Important note",
        body: [
          "This cancellation framework is placeholder policy copy and should be finalized before taking real payments.",
        ],
      },
    ],
  },
  {
    slug: "safety-policy",
    title: "Safety Policy",
    description: "Safety expectations for guests, hosts, listings, reports, and emergency situations.",
    updatedAt: "May 19, 2026",
    sections: [
      {
        title: "Safety expectations",
        body: [
          "Listings should disclose meaningful safety details, house rules, exterior cameras, alarms, pool risks, and guest limits.",
          "Guests and hosts should keep important communication in platform messages so admins can review a clear record if needed.",
        ],
      },
      {
        title: "Reports and disputes",
        body: [
          "Safety reports should be routed to admins for review, evidence collection, and follow-up with the guest or host.",
          "Immediate threats should be escalated to local emergency services first.",
        ],
      },
      {
        title: "Important note",
        body: [
          "This page is launch-prep content and must be reviewed for local regulations and operational feasibility before public release.",
        ],
      },
    ],
  },
];

export const legalPageMap = Object.fromEntries(legalPages.map((page) => [page.slug, page]));
