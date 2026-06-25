import Link from "next/link";
import { ArrowUpRight, Building2, Headphones, Home, MapPin, Search, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { footerColumns, futureGetaways } from "@/lib/home-data";
import { seoLocations } from "@/lib/seo-locations";
import { cn } from "@/lib/utils";

const columnMeta = [
  { icon: Headphones, intro: "Fast paths for trip help, safety reports, and account support." },
  { icon: Home, intro: "Tools and guidance for publishing, protecting, and improving a stay." },
  { icon: Building2, intro: "Company updates, policies, service status, and community programs." },
];

const lightFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083f35] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f2ea]";
const darkFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#063b33]";

export function SiteFooter({ flushTop = false }: { flushTop?: boolean } = {}) {
  return (
    <footer className={cn(!flushTop && "mt-12 md:mt-20", "border-t border-black/10 bg-[#f7f2ea] text-[#1f1b16]")}>
      <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-12 lg:py-12">
        <section className="grid gap-7 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.6fr)] lg:items-start">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Explore the Philippines</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-normal text-[#083f35] sm:text-3xl">
              Inspiration for future getaways
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/65 sm:text-base">
              Browse popular city searches and stay types without digging through the whole marketplace.
            </p>
            <Link
              href="/search"
              className={cn(
                "mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]",
                lightFocus,
              )}
            >
              <Search size={16} strokeWidth={2.4} />
              Search all stays
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {futureGetaways.map(([city, type]) => (
              <Link
                key={city}
                href={{ pathname: "/search", query: { location: `${city}, Philippines` } }}
                className={cn(
                  "group flex min-h-[76px] items-start gap-3 rounded-lg border border-black/10 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#083f35]/30 hover:shadow-md",
                  lightFocus,
                )}
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#e5f1ed] text-[#083f35] transition group-hover:bg-[#083f35] group-hover:text-white">
                  <MapPin size={15} strokeWidth={2.4} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-[#1f1b16]">{city}</span>
                  {type && <span className="mt-0.5 block text-xs leading-4 text-black/55">{type}</span>}
                </span>
              </Link>
            ))}
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
                  "inline-flex min-h-10 items-center rounded-full border border-black/10 bg-white px-4 font-semibold text-black/75 shadow-sm transition hover:border-[#083f35]/30 hover:text-[#083f35]",
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
        <div className="mx-auto max-w-[1480px] px-4 pb-24 pt-10 sm:px-6 md:pb-12 lg:px-12">
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
                  href="/register?role=host"
                  className={cn("inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10", darkFocus)}
                >
                  Become a host
                </Link>
              </div>
            </section>

            {footerColumns.map((column, index) => {
              const meta = columnMeta[index] ?? { icon: ShieldCheck, intro: "" };
              const Icon = meta.icon;

              return (
                <section key={column.title} className="border-t border-white/15 pt-5 lg:border-t-0 lg:pt-0">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f5cf86]">
                      <Icon size={18} strokeWidth={2.1} />
                    </span>
                    <div>
                      <h3 className="font-semibold leading-5">{column.title}</h3>
                      <p className="mt-1 max-w-xs text-sm leading-5 text-white/60">{meta.intro}</p>
                    </div>
                  </div>
                  <ul className="mt-5 grid gap-2 text-sm">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          className={cn(
                            "inline-flex min-h-8 items-center rounded-md px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white",
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
              );
            })}
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm text-white/65 md:flex-row md:items-center md:justify-between">
            <span>StayPrimePH 2026</span>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link className={cn("inline-flex min-h-8 items-center font-medium text-white transition hover:text-[#f5cf86]", darkFocus)} href="/newsroom">
                Newsroom
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
