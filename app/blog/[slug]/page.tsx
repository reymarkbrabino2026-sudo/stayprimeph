import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { env } from "@/lib/env";
import { getSeoBlogBySlug, getSortedSeoBlogs, seoBlogArticles, type SeoBlogBlock } from "@/lib/seo-blog-data";

export function generateStaticParams() {
  return seoBlogArticles.map((article) => ({ slug: article.slug }));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getSeoBlogBySlug(slug);
  if (!article) return { title: "Blog guide not found" };

  const imageUrl = `${env.NEXT_PUBLIC_APP_URL}${article.image.src}`;

  return {
    title: article.title,
    description: article.excerpt,
    keywords: [article.keyword, "StayPrime PH", "Philippines staycation", "vacation rentals Philippines"],
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${env.NEXT_PUBLIC_APP_URL}/blog/${article.slug}`,
      type: "article",
      publishedTime: article.date,
      images: [{ url: imageUrl, alt: article.image.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [imageUrl],
    },
  };
}

function ArticleBlock({ block, index }: { block: SeoBlogBlock; index: number }) {
  if (block.type === "h2") {
    return <h2 className="mt-9 text-2xl font-semibold leading-tight text-[#083f35]">{block.text}</h2>;
  }

  if (block.type === "h3") {
    return <h3 className="mt-6 text-lg font-semibold leading-snug text-[#1f1b16]">{block.text}</h3>;
  }

  if (block.type === "ul") {
    return (
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-black/75">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p className={index === 0 ? "mt-0 leading-7 text-black/75" : "mt-4 leading-7 text-black/75"}>{block.text}</p>;
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getSeoBlogBySlug(slug);
  if (!article) notFound();

  const url = `${env.NEXT_PUBLIC_APP_URL}/blog/${article.slug}`;
  const related = getSortedSeoBlogs()
    .filter((entry) => entry.slug !== article.slug && entry.category === article.category)
    .slice(0, 3);

  const breadcrumbItems: Crumb[] = [
    { label: "Blog", href: "/blog" },
    { label: article.title },
  ];

  const articleLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    keywords: article.keyword,
    image: `${env.NEXT_PUBLIC_APP_URL}${article.image.src}`,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: "StayPrime PH" },
    publisher: {
      "@type": "Organization",
      name: "StayPrime PH",
      logo: { "@type": "ImageObject", url: `${env.NEXT_PUBLIC_APP_URL}/favicon-512x512.png` },
    },
    mainEntityOfPage: url,
  };

  const breadcrumbLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${env.NEXT_PUBLIC_APP_URL}/blog` },
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
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a6a3f]">{article.category}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">{article.title}</h1>
          <p className="mt-4 text-base leading-7 text-black/65">{article.excerpt}</p>
          <p className="mt-3 text-sm text-black/55">
            By StayPrime PH | {formatDate(article.date)} | {article.readMinutes} min read
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={article.listingHref} className="inline-flex min-h-11 items-center rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]">
              View matching listings
            </Link>
            <Link href="/search" className="inline-flex min-h-11 items-center rounded-full border border-black/15 px-5 text-sm font-semibold transition hover:border-black/35">
              Browse all stays
            </Link>
          </div>
        </header>

        <figure className="mt-8">
          <div className="relative aspect-[1.85] overflow-hidden rounded-lg bg-[#f7f2ea]">
            <Image
              src={article.image.src}
              alt={article.image.alt}
              title={article.image.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              priority
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2 text-sm text-black/55">{article.image.title}</figcaption>
        </figure>

        <article className="mt-9">
          {article.body.map((block, index) => (
            <ArticleBlock key={`${block.type}-${index}`} block={block} index={index} />
          ))}

          <h2 className="mt-9 text-2xl font-semibold leading-tight text-[#083f35]">Plan with these links</h2>
          <h3 className="mt-6 text-lg font-semibold leading-snug text-[#1f1b16]">StayPrime internal links</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-black/75">
            {article.internalLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <Link className="font-semibold text-[#083f35] underline-offset-4 hover:underline" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-lg font-semibold leading-snug text-[#1f1b16]">Useful external references</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-black/75">
            {article.externalLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <a className="font-semibold text-[#083f35] underline-offset-4 hover:underline" href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </article>

        <section className="mt-10 rounded-lg bg-[#083f35] p-6 text-white">
          <h2 className="text-xl font-semibold">Go from guide to listings</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            This guide stays available for search visitors, while the main action sends guests to StayPrime PH listings that match the keyword.
          </p>
          <Link href={article.listingHref} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#083f35]">
            View listings for {article.keyword}
          </Link>
        </section>
      </main>

      {related.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
          <h2 className="text-xl font-semibold sm:text-2xl">Related keyword guides</h2>
          <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => (
              <Link key={entry.slug} href={`/blog/${entry.slug}`} className="group block">
                <div className="relative aspect-[1.6] overflow-hidden rounded-lg bg-[#f7f2ea]">
                  <Image
                    src={entry.image.src}
                    alt={entry.image.alt}
                    title={entry.image.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-3 font-semibold leading-snug transition group-hover:text-[#083f35] group-hover:underline">{entry.title}</h3>
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
