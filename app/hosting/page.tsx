import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";
import { footerPages } from "@/lib/home-data";

export const metadata: Metadata = {
  title: "List Your Property in the Philippines — Earn From Short-Term Rentals",
  description:
    "List your condo, house, or private resort on StayPrime PH and earn from short-term and staycation rentals. A simple property listing platform and Airbnb alternative for hosts in the Philippines.",
  alternates: { canonical: `${env.NEXT_PUBLIC_APP_URL}/hosting` },
  openGraph: {
    title: "List Your Property in the Philippines | StayPrime PH",
    description:
      "Rent out your condo, house, or resort and earn from short-term rentals. The property listing platform and Airbnb alternative for hosts in the Philippines.",
    url: `${env.NEXT_PUBLIC_APP_URL}/hosting`,
    type: "website",
  },
};

export default function HostingIndexPage() {
  const pages = Object.entries(footerPages.hosting);

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <section className="grid gap-8 rounded-[2rem] bg-[#f7f7f7] p-6 sm:p-8 md:grid-cols-[1fr_0.8fr] md:p-10">
          <div>
            <p className="text-sm font-semibold text-rose-600">For hosts</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              List your property in the Philippines and earn from short-term rentals
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
              Rent out your condo, house, or private resort on StayPrime — a simple property listing platform and Airbnb
              alternative for hosts in the Philippines. Create a listing, set your pricing, and start earning from staycations
              and short-term stays.
            </p>
            <Link
              href="/become-a-host/setup"
              className="mt-7 inline-flex min-h-11 items-center rounded-full bg-black px-6 font-semibold text-white transition hover:bg-black/85"
            >
              Start a listing
            </Link>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-black/50">Host workflow</p>
            <ol className="mt-4 space-y-4 text-sm text-black/70">
              {["Create a draft", "Add location and photos", "Set price and availability", "Submit for approval"].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black text-xs font-bold text-white">{index + 1}</span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map(([slug, page]) => (
            <Link
              key={slug}
              href={`/hosting/${slug}`}
              className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <p className="text-sm font-medium text-rose-600">{page.eyebrow}</p>
              <h2 className="mt-3 text-xl font-semibold">{page.title}</h2>
              <p className="mt-3 leading-7 text-black/65">{page.intro}</p>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
