import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";
import { legalPages } from "@/lib/legal-data";

export const metadata: Metadata = {
  title: "Legal Center",
  description: "Review StayPrimePH terms, privacy, cancellation, and safety policies.",
  alternates: { canonical: `${env.NEXT_PUBLIC_APP_URL}/legal` },
};

export default function LegalIndexPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <p className="text-sm font-semibold text-rose-600">Legal Center</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Clear rules for guests, hosts, and marketplace operations.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
          Review the policies that explain how bookings, privacy, cancellations, and safety work across StayPrimePH.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {legalPages.map((page) => (
            <Link
              key={page.slug}
              href={`/legal/${page.slug}`}
              className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <p className="text-sm text-black/50">Updated {page.updatedAt}</p>
              <h2 className="mt-3 text-xl font-semibold group-hover:underline">{page.title}</h2>
              <p className="mt-3 leading-7 text-black/65">{page.description}</p>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
