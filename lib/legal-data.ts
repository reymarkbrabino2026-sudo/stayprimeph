export type LegalPage = {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: { title: string; body: string[] }[];
};

const operatorContactSection = {
  title: "Operator and contact details",
  body: [
    "StayPrimePH is operated by Livewise Construction, trading as stayprimeph, in the Philippines.",
    "Business address: 2nd Floor block 1 lot 5 Congressional Road Rainbow Subdivision Bagungbong Caloocan, Caloocan, Philippines, 1421.",
    "Support email: support@stayprimeph.com. Privacy and data requests: privacy@stayprimeph.com. Phone: 0956 673 9577.",
  ],
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
        title: "Marketplace role",
        body: [
          "StayPrimePH helps connect guests and hosts, provides booking tools, keeps platform records, and may support payment, messaging, moderation, and dispute workflows.",
          "Hosts remain responsible for the stays, listings, property details, availability, pricing, local requirements, permits, taxes, safety disclosures, and guest-facing promises they publish.",
          "Guests and hosts should keep important communication, payment steps, support requests, and dispute evidence inside StayPrimePH whenever possible so the platform record is complete.",
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
      {
        title: "Platform standards",
        body: [
          "Users may not use StayPrimePH to post false listings, impersonate another person, move protected transactions off platform, upload unlawful content, harass others, bypass safety checks, or misuse personal data obtained through the service.",
          "Listings should clearly show the stay being offered, price, location area, house rules, material limitations, and any safety, accessibility, camera, amenity, or guest-limit details that would affect a booking decision.",
          "StayPrimePH may preserve records, cooperate with lawful requests, remove content, pause listings, or restrict accounts when needed for fraud prevention, safety review, dispute resolution, or legal compliance.",
        ],
      },
      operatorContactSection,
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
          "The platform may collect account details, profile information, listing content, booking records, messages, payment references, account settings, uploaded photos, support reports, and admin review records.",
          "If users sign in with Google or Facebook, StayPrimePH may receive basic profile information made available by that provider, such as name, email address, provider account identifier, and profile image, depending on the permissions approved by the user.",
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
        title: "Service providers and data sharing",
        body: [
          "StayPrimePH shares personal data only when needed to operate the marketplace, process payments, deliver emails, store listing media, authenticate users, detect abuse, comply with legal duties, or protect users.",
          "Current operational providers may include hosting, database, storage, payment, email, authentication, analytics, error monitoring, and rate-limiting vendors such as Vercel, Supabase, Stripe, Resend, Upstash, Sentry, Google, Facebook/Meta, and related infrastructure providers.",
          "Some providers may process data outside the Philippines. StayPrimePH remains responsible for using reasonable contractual, security, and operational safeguards for personal data handled by service providers.",
        ],
      },
      {
        title: "Retention and deletion",
        body: [
          "Booking and payment records may be retained for operational, tax, accounting, legal, fraud-prevention, and dispute-resolution purposes.",
          "Optional profile details, saved preferences, social-login links, unpublished listing drafts, support records, and non-essential account data may be deleted or anonymized when they are no longer needed or when a valid deletion request is approved.",
          "Backups, logs, accounting records, safety records, fraud-prevention records, and legal hold materials may remain for a limited period when retention is reasonably needed for security, dispute, tax, accounting, or legal reasons.",
        ],
      },
      {
        title: "Your privacy choices",
        body: [
          "Users may request help accessing, correcting, exporting, blocking, objecting to, or deleting personal data by using account privacy tools, contacting StayPrimePH support, or emailing privacy@stayprimeph.com.",
          "Marketing preferences can be changed in account notification settings. Essential account, security, booking, payment, and legal notices may still be sent when needed to operate the service.",
          "Users can remove a social-login connection through their Google or Facebook account settings, but should also contact StayPrimePH if they want platform account data reviewed for deletion.",
        ],
      },
      {
        title: "Security and incidents",
        body: [
          "StayPrimePH uses administrative, technical, and operational safeguards intended to protect account, booking, listing, message, payment-reference, and support data from unauthorized access or misuse.",
          "No internet service can guarantee perfect security, so users should protect their login credentials, avoid sharing one-time links or reset emails, and report suspicious activity promptly.",
          "If StayPrimePH identifies a personal data breach that requires notice, it will assess the incident, preserve relevant records, reduce harm where practical, and notify affected users and regulators when required by applicable law.",
        ],
      },
      operatorContactSection,
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
          "Users can request account or personal data deletion from account privacy settings, by contacting StayPrimePH support from the email address linked to their account, or by emailing privacy@stayprimeph.com.",
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
      {
        title: "Social login data",
        body: [
          "If the account was created or accessed through Facebook or Google, StayPrimePH will review and remove or anonymize the social-login identifier and optional profile data when deletion is approved, unless retention is required for security, legal, accounting, or dispute reasons.",
          "Removing StayPrimePH from Facebook, Google, or another identity provider may stop future sign-in access, but it does not automatically delete platform records that StayPrimePH must review separately.",
          "Users should also remove StayPrimePH from their social provider account settings if they want to stop future provider access.",
        ],
      },
      operatorContactSection,
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
      operatorContactSection,
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
      operatorContactSection,
    ],
  },
];

export const legalPageMap = Object.fromEntries(legalPages.map((page) => [page.slug, page]));
