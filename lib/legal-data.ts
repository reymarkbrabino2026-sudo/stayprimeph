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
    updatedAt: "June 7, 2026",
    sections: [
      {
        title: "Using the platform",
        body: [
          "StayPrimePH provides a marketplace for discovering, listing, and reserving short-term stays in the Philippines.",
          "Guests, hosts, and admins are responsible for keeping account details accurate, protecting login access, and using the platform lawfully and respectfully.",
          "StayPrimePH may limit, suspend, or remove accounts, listings, bookings, reviews, or messages when needed to protect users, comply with law, or prevent platform misuse.",
        ],
      },
      {
        title: "Bookings and listings",
        body: [
          "Hosts are responsible for truthful listing information, accurate availability, house rules, and safe guest experiences.",
          "Guests are responsible for reviewing listing details, respecting house rules, and completing payments through approved checkout flows.",
          "A booking is not considered confirmed until the required checkout, host approval, and payment steps for that listing are complete.",
        ],
      },
      {
        title: "Payments and disputes",
        body: [
          "Payments, refunds, and related fees are processed through approved payment partners and platform records.",
          "Disputes should be raised through StayPrimePH support with relevant booking, payment, message, and photo evidence so admins can review the record fairly.",
          "Guests and hosts should avoid off-platform payment requests because they reduce the protections available through StayPrimePH.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How StayPrimePH plans to handle account, listing, booking, payment, and messaging data.",
    updatedAt: "June 7, 2026",
    sections: [
      {
        title: "Information we collect",
        body: [
          "The platform may collect account details, profile information, listing content, booking records, messages, payment references, and support reports.",
          "Sensitive payment details should be handled by payment providers such as Stripe rather than stored directly in the application database.",
          "Technical data such as device, browser, IP address, analytics events, security logs, and error reports may be collected to keep the service reliable and secure.",
        ],
      },
      {
        title: "How information is used",
        body: [
          "Data is used to provide search, booking, host management, admin moderation, safety review, fraud prevention, and customer support.",
          "Operational integrations such as email, analytics, error tracking, storage, and rate limiting should only receive the minimum information needed.",
          "StayPrimePH may use contact details to send account notices, email verification, password reset links, booking updates, payment updates, safety messages, and support replies.",
        ],
      },
      {
        title: "Sharing, retention, and choices",
        body: [
          "StayPrimePH shares personal data only when needed to operate the marketplace, process payments, deliver emails, store listing media, detect abuse, comply with legal duties, or protect users.",
          "Booking and payment records may be retained for operational, tax, accounting, legal, fraud-prevention, and dispute-resolution purposes.",
          "Users may request account support, correction of inaccurate information, or deletion review by contacting StayPrimePH support.",
        ],
      },
    ],
  },
  {
    slug: "data-deletion",
    title: "Data Deletion Instructions",
    description: "How StayPrimePH users can request deletion of account data connected to email, Google, Facebook, bookings, listings, messages, and support records.",
    updatedAt: "June 7, 2026",
    sections: [
      {
        title: "How to request deletion",
        body: [
          "Users can request account or personal data deletion by contacting StayPrimePH support from the email address linked to their account.",
          "The request should include the account email address, the login provider used when known, and a short note that the user wants their StayPrimePH account data reviewed for deletion.",
          "For Facebook Login users, this page serves as the public data deletion instructions URL required by Meta.",
        ],
      },
      {
        title: "What may be deleted",
        body: [
          "StayPrimePH may delete or anonymize profile details, saved preferences, social login links, messages, wishlists, unpublished listings, and non-essential support records when deletion is approved.",
          "Some booking, payment, tax, safety, fraud-prevention, dispute, and legal records may need to be retained for operational, accounting, compliance, or user-protection reasons.",
          "When full deletion is not possible, StayPrimePH will limit retained data to what is reasonably needed and remove optional profile information where practical.",
        ],
      },
      {
        title: "Response process",
        body: [
          "StayPrimePH will review deletion requests after verifying that the requester controls the relevant account email or login identity.",
          "Users should receive a response confirming the request status, any records that must be retained, and whether additional verification is needed.",
          "For urgent privacy concerns, users should contact StayPrimePH support and include any relevant booking, listing, or account details so the team can locate the records.",
        ],
      },
    ],
  },
  {
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    description: "A clear baseline for guest cancellations, host cancellations, refunds, and booking status changes.",
    updatedAt: "June 7, 2026",
    sections: [
      {
        title: "Guest cancellations",
        body: [
          "Guests should review the cancellation terms shown during checkout before confirming a booking.",
          "Refund eligibility depends on the listing policy, booking status, payment status, and timing of the cancellation request.",
          "When a refund is approved, timing depends on the payment provider, bank, card network, and original payment method.",
        ],
      },
      {
        title: "Host cancellations",
        body: [
          "Hosts should avoid cancelling confirmed stays unless there is a legitimate safety, emergency, or availability issue.",
          "Admin review may be required when cancellations create guest harm or repeated reliability problems.",
          "Hosts may be asked to provide supporting details, update availability, or help StayPrimePH support the affected guest.",
        ],
      },
      {
        title: "Changes and exceptional cases",
        body: [
          "Date changes, guest-count changes, and booking modifications depend on listing availability, host approval, and any price difference.",
          "Safety incidents, verified emergencies, duplicate charges, failed payments, or platform errors may be reviewed separately from the standard cancellation flow.",
          "StayPrimePH support may request evidence before changing a booking, issuing a refund, or reversing a cancellation decision.",
        ],
      },
    ],
  },
  {
    slug: "safety-policy",
    title: "Safety Policy",
    description: "Safety expectations for guests, hosts, listings, reports, and emergency situations.",
    updatedAt: "June 7, 2026",
    sections: [
      {
        title: "Safety expectations",
        body: [
          "Listings should disclose meaningful safety details, house rules, exterior cameras, alarms, pool risks, and guest limits.",
          "Guests and hosts should keep important communication in platform messages so admins can review a clear record if needed.",
          "Users should not use StayPrimePH to threaten, harass, discriminate, misrepresent listings, request unsafe activity, or move protected bookings outside the platform.",
        ],
      },
      {
        title: "Reports and disputes",
        body: [
          "Safety reports should be routed to admins for review, evidence collection, and follow-up with the guest or host.",
          "Immediate threats should be escalated to local emergency services first.",
          "StayPrimePH may restrict accounts, remove listings, pause bookings, or preserve records while a safety report is being reviewed.",
        ],
      },
      {
        title: "Host and guest responsibilities",
        body: [
          "Hosts are expected to maintain safe access, clean facilities, working essentials, accurate amenity details, and clear arrival instructions.",
          "Guests are expected to follow house rules, respect occupancy limits, avoid property damage, and report urgent stay issues promptly.",
          "For medical, fire, crime, or immediate physical danger, users should contact local emergency services before contacting platform support.",
        ],
      },
    ],
  },
];

export const legalPageMap = Object.fromEntries(legalPages.map((page) => [page.slug, page]));
