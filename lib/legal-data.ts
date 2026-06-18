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
    description: "How StayPrimePH handles account, listing, booking, payment, messaging, security, and privacy-rights data.",
    updatedAt: "June 18, 2026",
    sections: [
      {
        title: "Information we collect",
        body: [
          "StayPrimePH collects account data such as name, email address, role, phone number when provided, password hash, email verification status, session records, and one-time token records for email verification, email change, password reset, admin MFA, and account deletion verification.",
          "The platform collects marketplace data such as listing details, property location fields, pricing, amenities, rules, availability, booking packages, uploaded listing images, wishlists, bookings, reviews, guest-host messages, support conversations, safety reports, disputes, cancellations, host reports, and host expenses.",
          "Payment and payout data includes booking amounts, payment method labels, payment status, provider or manual transaction references, refund and rejection records, platform ledger records, payout settings, tax settings, and protected payout or tax identifiers. StayPrimePH does not intentionally store full card numbers, bank login credentials, or raw tax and payout identifiers when tokenization or encryption is available.",
          "Security and compliance data includes trusted-origin checks, CSRF validation results, rate-limit state, login failure audit records with hashed email and IP values, password reset events, email change events, role change events, admin listing decisions, payment decisions, account anonymization records, and immutable audit logs for compliance-critical actions.",
          "If users sign in with Google or Facebook, StayPrimePH may receive basic profile information made available by that provider, such as name, email address, provider account identifier, and profile image, depending on the permissions approved by the user.",
          "Host listing drafts and preferences may be stored temporarily in the user's browser while the host creates a listing. Users should avoid entering unnecessary sensitive details into drafts and should sign out on shared devices.",
        ],
      },
      {
        title: "How information is used",
        body: [
          "StayPrimePH uses personal data to create and secure accounts, verify email addresses, support password reset and admin MFA, maintain sessions, route users by role, and revoke sessions after sensitive account changes.",
          "Marketplace data is used to publish and review listings, show search results, process bookings, manage host calendars and reports, support guest-host messaging, moderate support requests, investigate disputes, prevent double booking, and enforce platform rules.",
          "Payment, payout, tax, and ledger data is used to support checkout, manual or provider-confirmed payment review, refunds, cancellations, payout settings, tax workflows, accounting, fraud prevention, and dispute resolution.",
          "Security and audit data is used to detect abuse, throttle risky activity, investigate account takeover attempts, prove admin and payment decisions, preserve compliance evidence, debug incidents, and protect users and the platform.",
          "StayPrimePH may use contact details to send account notices, email verification links, password reset links, admin MFA codes, booking updates, payment updates, support replies, safety notices, privacy request updates, and legal or compliance notices.",
        ],
      },
      {
        title: "Service providers and data sharing",
        body: [
          "StayPrimePH shares personal data only when needed to operate hosting, database, storage, email, authentication, payment, fraud-prevention, support, analytics, error-monitoring, rate-limiting, security, backup, legal, accounting, or compliance workflows.",
          "Current or planned operational providers may include Vercel, Supabase, Cloudinary or other media storage, Stripe or other payment providers, Resend or other email providers, Upstash Redis, Sentry, Google, Facebook/Meta, GitHub, and related infrastructure providers.",
          "Hosts and guests may receive booking, listing, message, profile, and payment-status information that is necessary to complete a booking, host a stay, resolve a support issue, or enforce marketplace rules.",
          "Admins and authorized support personnel may access account, listing, booking, message, support, payment-reference, and audit data when needed for moderation, support, fraud prevention, dispute handling, payment review, privacy request handling, or legal compliance.",
          "Some providers and recipients may process data outside the Philippines. StayPrimePH uses reasonable operational, contractual, and security safeguards for personal data handled by service providers.",
        ],
      },
      {
        title: "Retention and deletion",
        body: [
          "StayPrimePH applies retention rules designed around the actual system: ordinary messages may be retained for up to 730 days, support messages for up to 365 days, closed support reports for up to 1,095 days, admin logs for up to 365 days, ordinary audit logs for up to 2,555 days, and unpublished listing drafts for up to 30 days.",
          "Immutable audit logs for listing approval or rejection, payment approval, payment rejection, payment refund, and verified account anonymization are preserved as compliance evidence and are not deleted by ordinary retention pruning.",
          "Booking, payment, payout, tax, ledger, refund, cancellation, safety, fraud-prevention, dispute, accounting, and legal records may be retained longer when needed for operational integrity, legal obligations, tax or accounting requirements, chargeback defense, abuse prevention, or user protection.",
          "When an account deletion request is verified and approved, StayPrimePH may anonymize profile data, remove login material, revoke sessions, mark related hosted listings as rejected where applicable, and retain only records that are reasonably needed for security, accounting, compliance, dispute, or legal reasons.",
          "Backups and provider logs may retain copies for a limited period according to backup rotation, security, and provider operations. Records subject to a legal hold, open dispute, payment review, fraud investigation, or safety incident may be retained until the issue is resolved.",
        ],
      },
      {
        title: "Your privacy choices",
        body: [
          "Users may access or correct many account details in account settings. Changing a login email requires password reauthentication and verification of the new email address before the login email is replaced.",
          "Users may request a machine-readable export of account data from privacy settings after email verification. Export requests are recorded in account privacy settings.",
          "Users may request account deletion from privacy settings after email verification. Deletion requests require one-time email verification before admin review or verified anonymization is completed.",
          "Users may request help accessing, correcting, exporting, blocking, objecting to, or deleting personal data by using account privacy tools, contacting support, or emailing privacy@stayprimeph.com.",
          "Marketing preferences can be changed in account notification settings. Essential account, security, booking, payment, support, privacy, legal, and compliance notices may still be sent when needed to operate the service.",
          "Users can remove a social-login connection through their Google or Facebook account settings, but should also contact StayPrimePH if they want platform account data reviewed for export, deletion, or anonymization.",
        ],
      },
      {
        title: "Security and incidents",
        body: [
          "StayPrimePH uses safeguards such as HTTPS-only production access, secure HTTP-only session cookies, trusted-origin checks, CSRF protections, server-side authorization checks, email verification, admin MFA, host step-up authentication for payout-related settings, password hashing, session revocation after sensitive changes, rate limiting, and provider secret management.",
          "Sensitive identifiers such as tax IDs and payout identifiers are minimized, encrypted, tokenized, or reduced to display-safe values where possible. Logs and error monitoring should scrub raw emails, tokens, passwords, tax IDs, payout identifiers, and other sensitive personal data.",
          "Audit logs are used for accountability. Compliance-critical audit records are designed to be append-only so payment decisions, listing decisions, and verified account anonymization cannot be silently changed or deleted through normal application flows.",
          "No internet service can guarantee perfect security, so users should protect login credentials, avoid sharing one-time links, reset emails, or admin MFA codes, keep devices secure, and report suspicious activity promptly.",
          "If StayPrimePH identifies a personal data breach that requires notice, it will assess the incident, preserve relevant records, reduce harm where practical, and notify affected users and regulators when required by applicable law.",
        ],
      },
      {
        title: "Cookies and local storage",
        body: [
          "StayPrimePH uses secure session cookies to keep users signed in and to protect authenticated requests. Session cookies should be HttpOnly, Secure in production, and SameSite=Lax.",
          "The application avoids storing auth or session tokens in localStorage. Browser storage may be used for non-token preferences or temporary host listing drafts, and draft data should be cleared after publish or logout where practical.",
          "Users can clear browser storage through their browser settings, but doing so may remove draft progress or local preferences.",
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
          "Verified deletion or anonymization requests are targeted for completion within 30 days after user verification, unless active bookings, submitted payments, safety issues, disputes, accounting duties, fraud-prevention review, or legal holds require more time.",
          "Admins review verified requests in an account deletion queue that shows whether a request is awaiting verification, ready for review, or past the 30-day service target.",
          "Users should receive a response confirming the request status, any records that must be retained, and whether additional verification or delay notice is needed.",
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
