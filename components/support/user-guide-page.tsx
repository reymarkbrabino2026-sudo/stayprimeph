import Link from "next/link";
import { BookOpen, HelpCircle, ShieldCheck } from "lucide-react";

type GuideStep = {
  text: string;
  href: string;
  linkLabel: string;
};

type GuideSection = {
  title: string;
  intro: string;
  steps: GuideStep[];
};

const guideSections: GuideSection[] = [
  {
    title: "Getting Started",
    intro: "Use the correct account type before you book, host, or manage the platform.",
    steps: [
      { text: "Start from the home page when you are not sure where to go.", href: "/", linkLabel: "Home" },
      { text: "Create a guest account before booking a stay.", href: "/register?role=guest", linkLabel: "Guest registration" },
      { text: "Create a host account before listing a property.", href: "/register/host", linkLabel: "Host registration" },
      { text: "Recover your password when you cannot sign in.", href: "/forgot-password", linkLabel: "Forgot password" },
    ],
  },
  {
    title: "Search And Book",
    intro: "Find a stay, review the listing, then track the booking from your guest dashboard.",
    steps: [
      { text: "Search by location, dates, guests, price, property type, bedrooms, or amenities.", href: "/search", linkLabel: "Search stays" },
      { text: "Open a listing from search to review photos, amenities, rules, reviews, and location.", href: "/search", linkLabel: "Browse listings" },
      { text: "Use a guest account if the checkout page asks you to sign in.", href: "/login?role=guest", linkLabel: "Guest login" },
      { text: "Track pending, upcoming, completed, and cancelled trips after requesting a booking.", href: "/guest/bookings", linkLabel: "My Bookings" },
      { text: "Message hosts about stay details from your guest inbox.", href: "/guest/messages", linkLabel: "Guest messages" },
    ],
  },
  {
    title: "Guest Dashboard",
    intro: "These pages help guests manage trips, saved stays, messages, alerts, reviews, and profile details.",
    steps: [
      { text: "Check your main guest activity.", href: "/guest/dashboard", linkLabel: "Guest overview" },
      { text: "Return to homes you saved for later.", href: "/guest/wishlist", linkLabel: "Wishlist" },
      { text: "Check trip, payment, and message alerts.", href: "/guest/notifications", linkLabel: "Guest notifications" },
      { text: "Review your traveler identity and profile details.", href: "/guest/profile", linkLabel: "Guest profile" },
    ],
  },
  {
    title: "Create A Listing",
    intro: "Hosts can add the property, photos, rules, pricing, packages, safety details, and final review details.",
    steps: [
      { text: "Upgrade a guest account when you want to become a host.", href: "/become-a-host/upgrade", linkLabel: "Host upgrade" },
      { text: "Start or continue the listing wizard.", href: "/become-a-host/setup", linkLabel: "Host listing setup" },
      { text: "Open the create listing shortcut from the host dashboard.", href: "/host/listings/create", linkLabel: "Create Listing" },
      { text: "Check whether a submitted listing is pending, approved, or needs changes.", href: "/host/listings", linkLabel: "My Listings" },
      { text: "Ask support for help when photos, pricing, or approval status are unclear.", href: "/support/help-center", linkLabel: "Support live chat" },
    ],
  },
  {
    title: "Host Dashboard",
    intro: "Hosts use these pages to run daily operations after a listing has been created.",
    steps: [
      { text: "Review your host activity summary.", href: "/host/dashboard", linkLabel: "Host overview" },
      { text: "Block unavailable dates or manage availability.", href: "/host/calendar", linkLabel: "Calendar Availability" },
      { text: "Review guest booking requests.", href: "/host/bookings", linkLabel: "Booking Requests" },
      { text: "Reply to guests about bookings and listing questions.", href: "/host/messages", linkLabel: "Host messages" },
      { text: "Review earnings, reports, payout settings, and host notifications.", href: "/host/earnings", linkLabel: "Earnings" },
    ],
  },
  {
    title: "Account Settings",
    intro: "Use account settings when personal details, security, privacy, payments, or notifications need changes.",
    steps: [
      { text: "Update profile and personal details.", href: "/account-settings", linkLabel: "Personal information" },
      { text: "Change password, passkeys, and security settings.", href: "/account-settings/login-and-security", linkLabel: "Login and security" },
      { text: "Manage privacy and account data choices.", href: "/account-settings/privacy", linkLabel: "Privacy" },
      { text: "Adjust notification preferences.", href: "/account-settings/notifications", linkLabel: "Notifications" },
      { text: "Update payment, payout, tax, language, and currency settings.", href: "/account-settings/payments", linkLabel: "Payments" },
    ],
  },
  {
    title: "Payments And Payouts",
    intro: "Check the correct dashboard depending on whether you are a guest, host, or admin.",
    steps: [
      { text: "Guests should check booking payment status from their trip list.", href: "/guest/bookings", linkLabel: "My Bookings" },
      { text: "Hosts should check payout setup before expecting payouts.", href: "/host/payouts", linkLabel: "Payout Settings" },
      { text: "Hosts should review sales and earnings summaries.", href: "/host/earnings", linkLabel: "Earnings" },
      { text: "Admins should review payment records from the admin area.", href: "/admin/payments", linkLabel: "Admin payments" },
      { text: "Contact support if the visible payment status does not match what happened.", href: "/support/help-center", linkLabel: "Support live chat" },
    ],
  },
  {
    title: "Admin Tasks",
    intro: "Admins can review users, hosts, listings, bookings, payments, reports, disputes, and support messages.",
    steps: [
      { text: "Start from the admin dashboard.", href: "/admin/dashboard", linkLabel: "Admin overview" },
      { text: "Answer guest and host support messages.", href: "/admin/support", linkLabel: "Support Inbox" },
      { text: "Review and approve submitted host listings.", href: "/admin/listings", linkLabel: "Listings Approval" },
      { text: "Review bookings, payments, and disputes.", href: "/admin/bookings", linkLabel: "Bookings" },
      { text: "Manage admin settings when configuration needs to change.", href: "/admin/settings", linkLabel: "Admin settings" },
    ],
  },
  {
    title: "Troubleshooting",
    intro: "Start with the page that matches the problem, then contact support with clear details.",
    steps: [
      { text: "Use password recovery when login fails.", href: "/forgot-password", linkLabel: "Forgot password" },
      { text: "Clear filters when search shows no results.", href: "/search", linkLabel: "Search stays" },
      { text: "Check booking details when a trip appears missing.", href: "/guest/bookings", linkLabel: "My Bookings" },
      { text: "Check listing status when a listing is not visible to guests.", href: "/host/listings", linkLabel: "My Listings" },
      { text: "Check service availability when the app seems unavailable.", href: "/status", linkLabel: "Service status" },
    ],
  },
];

export function UserGuidePage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <section className="rounded-[2rem] bg-[#fff7ed] p-6 sm:p-8 md:p-10">
        <div className="flex max-w-3xl items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
            <BookOpen size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-rose-600">User Guide</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">How to use StayPrimePH</h1>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-7 text-black/65 sm:text-lg">
          Simple steps for guests, hosts, and admins. Every step includes a link to the page where the action happens.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/support/help-center"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]"
          >
            <HelpCircle size={17} /> Contact support
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/30"
          >
            <ShieldCheck size={17} /> Start browsing
          </Link>
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {guideSections.map((section) => (
          <section key={section.title} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 leading-7 text-black/60">{section.intro}</p>
            <ol className="mt-5 space-y-3">
              {section.steps.map((step, index) => (
                <li key={`${section.title}-${step.href}-${index}`} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f4ef] text-sm font-bold text-[#083f35]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 text-sm leading-6 text-black/70">
                    {step.text}{" "}
                    <Link href={step.href} className="font-semibold text-[#083f35] underline underline-offset-4">
                      {step.linkLabel}
                    </Link>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
