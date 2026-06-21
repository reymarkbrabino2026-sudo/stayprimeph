import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { NewsroomGrid } from "@/components/newsroom/newsroom-grid";
import { Navbar } from "@/components/public/navbar";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { getSortedArticles } from "@/lib/newsroom-data";

export const metadata: Metadata = {
  title: "Newsroom — Staycation & Vacation Rental Stories in the Philippines",
  description:
    "News, guides, and stories about staycations, vacation rentals, and short-term rental hosting in the Philippines from StayPrime PH.",
  alternates: { canonical: "/newsroom" },
  openGraph: {
    title: "StayPrime PH Newsroom",
    description: "Staycation guides, vacation rental tips, and hosting stories from the Philippines.",
    url: `${env.NEXT_PUBLIC_APP_URL}/newsroom`,
    type: "website",
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export default function NewsroomPage() {
  const articles = getSortedArticles();
  const featured = articles[0];
  const latest = articles.slice(1, 5);

  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "StayPrime PH Newsroom",
    description: "News, guides, and stories about staycations and vacation rentals in the Philippines.",
    url: `${env.NEXT_PUBLIC_APP_URL}/newsroom`,
  };

  return (
    <div className="bg-white text-[#1f1b16]">
      <JsonLd data={collectionLd} />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-12">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Newsroom</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">Stories, guides, and StayPrime news</h1>
          <p className="mt-4 text-base leading-7 text-black/65 sm:text-lg">
            Staycation guides, vacation rental tips, and short-term rental hosting stories from across the Philippines.
          </p>
        </header>

        {featured ? (
          <Link href={`/newsroom/${featured.slug}`} className="group mt-10 grid gap-6 overflow-hidden rounded-[2rem] border border-black/10 md:grid-cols-2">
            <div className={`relative aspect-[1.6] overflow-hidden bg-gradient-to-br md:aspect-auto ${featured.heroTone}`}>
              <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/newsroom/${featured.slug}.svg')` }} />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6a3f]">{featured.topic} · {formatDate(featured.date)}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-snug transition group-hover:underline sm:text-3xl">{featured.title}</h2>
              <p className="mt-3 text-black/65">{featured.excerpt}</p>
              <span className="mt-5 text-sm font-semibold text-[#083f35]">Read more →</span>
            </div>
          </Link>
        ) : null}

        {latest.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold sm:text-2xl">Latest news</h2>
            <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((article) => (
                <Link key={article.slug} href={`/newsroom/${article.slug}`} className="group block">
                  <div className={`relative aspect-[1.4] overflow-hidden rounded-2xl bg-gradient-to-br ${article.heroTone}`}>
                    <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/newsroom/${article.slug}.svg')` }} />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6a3f]">{article.topic}</p>
                  <h3 className="mt-1 font-semibold leading-snug transition group-hover:underline">{article.title}</h3>
                  <p className="mt-2 text-sm text-black/55">{formatDate(article.date)}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16">
          <h2 className="text-xl font-semibold sm:text-2xl">News by topic</h2>
          <div className="mt-6">
            <NewsroomGrid articles={articles} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
