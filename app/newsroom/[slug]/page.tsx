import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { getArticleBySlug, getSortedArticles, newsArticles } from "@/lib/newsroom-data";

export function generateStaticParams() {
  return newsArticles.map((article) => ({ slug: article.slug }));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Story not found" };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/newsroom/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `/newsroom/${article.slug}`,
      type: "article",
      publishedTime: article.date,
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const url = `${env.NEXT_PUBLIC_APP_URL}/newsroom/${article.slug}`;
  const related = getSortedArticles().filter((entry) => entry.slug !== article.slug).slice(0, 3);

  const breadcrumbItems: Crumb[] = [
    { label: "Newsroom", href: "/newsroom" },
    { label: article.title },
  ];

  const articleLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@type": "Organization", name: "StayPrime PH", logo: { "@type": "ImageObject", url: `${env.NEXT_PUBLIC_APP_URL}/favicon-512x512.png` } },
    mainEntityOfPage: url,
  };
  const breadcrumbLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Newsroom", item: `${env.NEXT_PUBLIC_APP_URL}/newsroom` },
      { "@type": "ListItem", position: 2, name: article.title, item: url },
    ],
  };

  return (
    <div className="bg-white text-[#1f1b16]">
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <Breadcrumbs items={breadcrumbItems} />

        <header className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a6a3f]">{article.topic}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-sm text-black/55">
            By {article.author} · {formatDate(article.date)} · {article.readMinutes} min read
          </p>
        </header>

        {article.keyTakeaways.length > 0 ? (
          <aside className="mt-7 rounded-2xl border border-black/10 bg-[#fbf7f2] p-5">
            <p className="text-sm font-semibold">Key takeaways</p>
            <ul className="mt-3 space-y-2 text-sm text-black/70">
              {article.keyTakeaways.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden="true" className="mt-1 size-1.5 shrink-0 rounded-full bg-[#083f35]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <div className={`relative mt-8 aspect-[2/1] overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${article.heroTone}`}>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/newsroom/${article.slug}.svg')` }} />
        </div>

        <article className="mt-8">
          {article.body.map((block, index) => {
            if (block.type === "h2") {
              return <h2 key={index} className="mt-8 text-xl font-semibold sm:text-2xl">{block.text}</h2>;
            }
            if (block.type === "ul") {
              return (
                <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-black/75">
                  {block.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              );
            }
            return <p key={index} className="mt-4 leading-7 text-black/75">{block.text}</p>;
          })}
        </article>

        <div className="mt-10 rounded-2xl bg-[#083f35] p-6 text-white">
          <h2 className="text-lg font-semibold">Find your next stay on StayPrime</h2>
          <p className="mt-2 text-sm text-white/80">Browse affordable staycations and vacation rentals across the Philippines, or list your own property.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/search" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#083f35]">Browse stays</Link>
            <Link href="/hosting" className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white">List your property</Link>
          </div>
        </div>
      </main>

      {related.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
          <h2 className="text-xl font-semibold sm:text-2xl">Related stories</h2>
          <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => (
              <Link key={entry.slug} href={`/newsroom/${entry.slug}`} className="group block">
                <div className={`relative aspect-[1.6] overflow-hidden rounded-2xl bg-gradient-to-br ${entry.heroTone}`}>
                  <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/newsroom/${entry.slug}.svg')` }} />
                </div>
                <h3 className="mt-3 font-semibold leading-snug transition group-hover:underline">{entry.title}</h3>
                <p className="mt-2 text-sm text-black/55">{formatDate(entry.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </div>
  );
}
