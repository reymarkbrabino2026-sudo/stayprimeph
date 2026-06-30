import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { footerColumns, futureGetaways } from "@/lib/home-data";
import { destinationHrefForLocation } from "@/lib/seo-location-links";
import { seoLocations } from "@/lib/seo-locations";
import { cn } from "@/lib/utils";

const lightFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083f35] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f2ea]";
const darkFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#063b33]";

export function SiteFooter({ flushTop = false }: { flushTop?: boolean } = {}) {
  return (
    <footer className={cn(!flushTop && "mt-12 md:mt-20", "border-t border-black/10 bg-[#f7f2ea] text-[#1f1b16]")}>
      <div className="w-full px-6 py-8 sm:px-6 md:px-6 lg:px-9 2xl:px-10">
        <section>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 md:gap-x-10 lg:grid-cols-4 xl:grid-cols-6">
            {futureGetaways.slice(0, 17).map(([city, type]) => (
              <Link
                key={city}
                href={destinationHrefForLocation(city)}
                className={cn(
                  "group block rounded-md transition hover:text-[#083f35]",
                  lightFocus,
                )}
              >
                <span className="block text-sm font-semibold leading-5 text-[#1f1b16] transition group-hover:text-[#083f35]">{city}</span>
                {type && <span className="mt-0.5 block text-sm leading-5 text-black/60">{type}</span>}
              </Link>
            ))}
            <Link
              href="/search"
              className={cn(
                "inline-flex items-start gap-1 rounded-md text-sm font-semibold leading-5 text-[#1f1b16] transition hover:text-[#083f35]",
                lightFocus,
              )}
            >
              Show more
              <ChevronDown className="mt-0.5" size={16} strokeWidth={2.3} />
            </Link>
          </div>
        </section>

        <section className="mt-10 border-t border-black/10 pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Staycation guides</p>
              <h2 className="mt-2 text-xl font-semibold leading-tight text-[#083f35] sm:text-2xl">Popular staycation destinations</h2>
            </div>
            <Link href="/search" className={cn("inline-flex min-h-8 items-center gap-1.5 self-start text-sm font-semibold text-[#083f35] transition hover:text-[#062f28]", lightFocus)}>
              View all
              <ArrowUpRight size={15} strokeWidth={2.4} />
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {seoLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/staycation/${location.slug}`}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full border border-black/20 bg-transparent px-4 font-semibold text-black/75 transition hover:border-[#083f35]/40 hover:text-[#083f35]",
                  lightFocus,
                )}
              >
                {location.name} staycations
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="bg-[#063b33] text-white">
        <div className="w-full px-6 pb-24 pt-10 sm:px-6 md:px-6 md:pb-12 lg:px-9 2xl:px-10">
          <div className="grid gap-9 lg:grid-cols-[minmax(15rem,0.8fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
            <section className="max-w-sm">
              <Link href="/" aria-label="StayPrimePH home" className={cn("inline-flex", darkFocus)}>
                <BrandLogo variant="white" className="h-10 w-auto" priority={false} />
              </Link>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Local stays, practical hosting tools, and clearer support for trips around the Philippines.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/search"
                  className={cn("inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#063b33] transition hover:bg-[#f3eadb]", darkFocus)}
                >
                  Explore stays
                </Link>
                <Link
                  href="/register/host"
                  className={cn("inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10", darkFocus)}
                >
                  Become a host
                </Link>
              </div>
            </section>

            {footerColumns.map((column) => (
              <section key={column.title} className="border-t border-white/15 pt-5 lg:border-t-0 lg:pt-0">
                <h3 className="font-semibold leading-5">{column.title}</h3>
                <ul className="mt-5 grid gap-2 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className={cn(
                          "inline-flex min-h-8 items-center rounded-md font-medium text-white/80 transition hover:text-white",
                          darkFocus,
                        )}
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm text-white/65 md:flex-row md:items-center md:justify-between">
            <span>StayPrimePH 2026</span>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link className={cn("inline-flex min-h-8 items-center font-medium text-white transition hover:text-[#f5cf86]", darkFocus)} href="/newsroom">
                Newsroom
              </Link>
              <Link className={cn("inline-flex min-h-8 items-center font-medium text-white transition hover:text-[#f5cf86]", darkFocus)} href="/blog">
                Blog
              </Link>
              <Link className={cn("inline-flex min-h-8 items-center font-medium text-white transition hover:text-[#f5cf86]", darkFocus)} href="/legal/privacy">
                Privacy Policy
              </Link>
              <Link className={cn("inline-flex min-h-8 items-center font-medium text-white transition hover:text-[#f5cf86]", darkFocus)} href="/status">
                Service status
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
