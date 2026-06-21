import Link from "next/link";
import { footerColumns, futureGetaways } from "@/lib/home-data";
import { seoLocations } from "@/lib/seo-locations";

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-[#083f35] px-4 pb-24 pt-10 text-white sm:px-6 md:mt-20 md:pb-12 lg:px-12">
      <section>
        <h2 className="text-xl font-semibold sm:text-2xl">Inspiration for future getaways</h2>
        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {futureGetaways.map(([city, type]) => (
            <Link
              key={city}
              href={{ pathname: "/search", query: { location: `${city}, Philippines` } }}
              className="group -m-2 rounded-2xl p-2 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <p className="font-medium transition group-hover:underline">{city}</p>
              {type && <p className="text-sm text-white/70">{type}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold sm:text-2xl">Popular staycation destinations</h2>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {seoLocations.map((location) => (
            <Link
              key={location.slug}
              href={`/staycation/${location.slug}`}
              className="text-white/80 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {location.name} staycations
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-16 grid gap-10 md:grid-cols-3">
        {footerColumns.map((column) => (
          <section key={column.title}>
            <h3 className="font-semibold">{column.title}</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className="transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-white/15 pt-6 text-sm text-white/70">
        <Link className="font-medium text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/legal/privacy">
          Privacy Policy
        </Link>
        <span className="mx-2">|</span>
        <span>StayPrimePH 2026</span>
      </div>
    </footer>
  );
}
