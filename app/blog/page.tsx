import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { getSortedSeoBlogs, seoBlogCategories, type SeoBlogArticle } from "@/lib/seo-blog-data";

export const metadata: Metadata = {
  title: "Philippines Staycation & Vacation Rental Blog",
  description:
    "SEO travel guides for Philippine staycations, vacation rentals, near-me searches, private resorts, condos, and local short-term stays.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "StayPrime PH Blog",
    description: "Philippines staycation, vacation rental, and local travel search guides from StayPrime PH.",
    url: `${env.NEXT_PUBLIC_APP_URL}/blog`,
    type: "website",
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function BlogCard({ article }: { article: SeoBlogArticle }) {
  return (
    <article className="group">
      <Link href={`/blog/${article.slug}`} className="block">
        <div className="relative aspect-[1.45] overflow-hidden rounded-lg bg-[#f7f2ea]">
          <Image
            src={article.image.src}
            alt={article.image.alt}
            title={article.image.title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6a3f]">{article.category}</p>
        <h3 className="mt-1 text-base font-semibold leading-snug transition group-hover:text-[#083f35] group-hover:underline">
          {article.title}
        </h3>
        <p className="mt-2 text-sm text-black/55">{formatDate(article.date)} | {article.readMinutes} min read</p>
      </Link>
      <Link
        href={article.listingHref}
        className="mt-3 inline-flex min-h-9 items-center rounded-full border border-black/15 px-3 text-sm font-semibold text-[#083f35] transition hover:border-[#083f35]/40 hover:bg-[#eef4ef]"
      >
        View listings
      </Link>
    </article>
  );
}

export default function BlogPage() {
  const articles = getSortedSeoBlogs();
  const collectionLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "StayPrime PH Blog",
    description: "SEO travel guides for staycations, vacation rentals, and short-term stays in the Philippines.",
    url: `${env.NEXT_PUBLIC_APP_URL}/blog`,
  };

  return (
    <div className="bg-white text-[#1f1b16]">
      <JsonLd data={collectionLd} />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-12">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">StayPrime PH Blog</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal sm:text-5xl">
            Philippines staycation and vacation rental guides
          </h1>
          <p className="mt-4 text-base leading-7 text-black/65 sm:text-lg">
            Keyword-focused travel guides for guests searching from Mindanao to Luzon, including local near-me searches,
            city staycations, private resorts, condos, transient houses, and short-term rentals.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/search" className="inline-flex min-h-11 items-center rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]">
              Browse listings
            </Link>
            <Link href="/newsroom" className="inline-flex min-h-11 items-center rounded-full border border-black/15 px-5 text-sm font-semibold transition hover:border-black/35">
              Read newsroom
            </Link>
          </div>
        </header>

        {seoBlogCategories.map((category) => {
          const categoryArticles = articles.filter((article) => article.category === category);
          if (categoryArticles.length === 0) return null;

          return (
            <section key={category} className="mt-14 border-t border-black/10 pt-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a3f]">{category}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{category} keyword guides</h2>
                </div>
                <p className="text-sm text-black/55">{categoryArticles.length} guides</p>
              </div>
              <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
                {categoryArticles.map((article) => (
                  <BlogCard key={article.slug} article={article} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <SiteFooter />
    </div>
  );
}
