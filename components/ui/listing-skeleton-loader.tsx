import { Globe, Menu, Search } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

const cards = Array.from({ length: 14 }, (_, index) => index);

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

      {/* Solid header — stays real, only the search pill is skeletonized */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white">
        <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
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

      <section className="px-4 py-8 sm:px-6 lg:px-12">
        <div className="sk-block mb-6 h-5 w-44 rounded-lg" />
        <div className="grid gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {cards.map((card) => (
            <SkeletonCard key={card} />
          ))}
        </div>
      </section>
    </main>
  );
}
