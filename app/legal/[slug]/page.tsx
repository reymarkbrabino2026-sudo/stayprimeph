import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";
import { legalPageMap, legalPages } from "@/lib/legal-data";

type LegalPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return legalPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPageMap[slug];
  if (!page) return {};

  return {
    title: `${page.title} | StayPrimePH`,
    description: page.description,
    alternates: {
      canonical: `${env.NEXT_PUBLIC_APP_URL}/legal/${page.slug}`,
    },
    openGraph: {
      title: `${page.title} | StayPrimePH`,
      description: page.description,
      url: `${env.NEXT_PUBLIC_APP_URL}/legal/${page.slug}`,
      type: "article",
    },
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const page = legalPageMap[slug];
  if (!page) notFound();

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:px-6 md:py-16">
        <p className="text-sm font-medium text-rose-600">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-black/55">Last updated {page.updatedAt}</p>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">{page.description}</p>

        <div className="mt-10 space-y-4">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 leading-7 text-black/65">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-[#fff7ed] p-5 text-sm leading-6 text-[#7c2d12]">
          Questions about these policies should be raised before booking, hosting, or completing a payment.
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition hover:bg-black/85"
        >
          Back to StayPrimePH
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
