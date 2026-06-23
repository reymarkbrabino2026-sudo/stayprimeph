import { ConciergeBell, Globe, Home, Menu, Search, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

const cards = Array.from({ length: 14 }, (_, index) => index);
const mobileCategories = [
  { label: "Homes", icon: Home, active: true },
  { label: "Experiences", icon: Sparkles, badge: "NEW" },
  { label: "Services", icon: ConciergeBell, badge: "NEW" },
];

function SkeletonCard() {
  return (
    <article className="min-w-0">
      <div className="sk-block aspect-[1.03] rounded-2xl" />
      <div className="sk-block mt-3 h-3.5 w-3/4 rounded-full" />
      <div className="sk-block mt-2 h-3.5 w-1/2 rounded-full" />
    </article>
  );
}

export function ListingSkeletonLoader() {
  return (
    <main role="status" aria-label="Loading" className="min-h-screen bg-white text-[#1f1b16]">
      <span className="sr-only">Loading…</span>

      <header className="sticky top-0 z-50 border-b border-black/10 bg-white">
        <nav className="flex h-[82px] items-end justify-center gap-8 px-4 pb-2 md:hidden" aria-label="Loading browse categories">
          {mobileCategories.map(({ label, icon: Icon, active, badge }) => (
            <span
              key={label}
              className={`relative flex min-w-20 flex-col items-center justify-end gap-1.5 pb-2 text-xs font-medium ${
                active ? "text-black" : "text-black/65"
              }`}
            >
              {badge ? (
                <span className="absolute -top-1 right-2 rounded-md bg-[#23344a] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
                  {badge}
                </span>
              ) : null}
              <Icon size={28} strokeWidth={active ? 2.25 : 1.9} />
              <span>{label}</span>
              {active ? <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-black" /> : null}
            </span>
          ))}
        </nav>

        <div className="hidden h-[72px] items-center justify-between gap-4 px-4 sm:px-6 md:flex lg:px-12">
          <BrandLogo className="h-9 w-auto" />

          <div className="hidden h-12 w-[min(24rem,42vw)] items-center gap-3 rounded-full border border-black/10 pl-5 pr-2 shadow-[0_2px_10px_rgb(0_0_0_/_0.08)] md:flex">
            <span className="sk-block h-3 w-20 rounded-full" />
            <span className="h-5 w-px bg-black/10" />
            <span className="sk-block h-3 w-14 rounded-full" />
            <span className="h-5 w-px bg-black/10" />
            <span className="sk-block h-3 w-14 rounded-full" />
            <span className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
              <Search size={16} strokeWidth={3} />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium sm:inline">Become a host</span>
            <span className="hidden size-10 place-items-center rounded-full border border-black/10 text-black/60 sm:grid">
              <Globe size={18} />
            </span>
            <span className="grid size-10 place-items-center rounded-full border border-black/10 text-black/60">
              <Menu size={18} />
            </span>
          </div>
        </div>
      </header>

      <section className="px-6 py-8 sm:px-6 lg:px-12">
        <div className="sk-block mb-6 h-5 w-44 rounded-lg" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 md:gap-y-9 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {cards.map((card) => (
            <SkeletonCard key={card} />
          ))}
        </div>
      </section>
    </main>
  );
}
