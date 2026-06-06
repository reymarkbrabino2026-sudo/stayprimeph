import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Trust and Safety",
  description: "StayPrimePH trust and safety guidance for guests, hosts, reports, reviews, and admin moderation.",
  alternates: { canonical: `${env.NEXT_PUBLIC_APP_URL}/trust-and-safety` },
};

const cards = [
  ["Verified flows", "Email verification, password reset, role-aware sessions, and admin review keep the marketplace accountable."],
  ["Listing approval", "New host listings can stay pending until admins approve them for guest discovery."],
  ["Reports and disputes", "Guests and hosts can escalate issues so admins can review evidence and respond fairly."],
  ["Safer payments", "Payments are designed to go through Stripe checkout rather than storing card details locally."],
];

export default function TrustAndSafetyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <section className="rounded-[2rem] bg-[#fff7ed] p-6 sm:p-8 md:p-10">
          <p className="text-sm font-semibold text-rose-600">Trust & Safety</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Marketplace trust is designed into the flow.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
            StayPrimePH combines account safeguards, admin moderation, listing approval, reporting, and clear policies to reduce avoidable risk.
          </p>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map(([title, body]) => (
            <section key={title} className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-black/65">{body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-full bg-black px-5 py-3 font-semibold text-white" href="/legal/safety-policy">
            Read safety policy
          </Link>
          <Link className="rounded-full border px-5 py-3 font-semibold" href="/support/safety">
            Get safety help
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
