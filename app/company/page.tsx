import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";
import { footerPages } from "@/lib/home-data";

export const metadata: Metadata = {
  title: "Company",
  description: "Learn about StayPrimePH product updates, company stories, travel credit planning, and community stay relief.",
  alternates: { canonical: `${env.NEXT_PUBLIC_APP_URL}/company` },
};

export default function CompanyIndexPage() {
  const pages = Object.entries(footerPages.company);

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <section className="rounded-[2rem] bg-[#f7f7f7] p-6 sm:p-8 md:p-10">
          <p className="text-sm font-semibold text-rose-600">Company</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Building a marketplace that feels calm, useful, and trustworthy.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
            Explore product updates, company stories, future travel credit, and community stay relief planning.
          </p>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map(([slug, page]) => (
            <Link
              key={slug}
              href={`/company/${slug}`}
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
