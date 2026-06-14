import { BrandLogo } from "@/components/brand/brand-logo";

const cards = Array.from({ length: 14 }, (_, index) => index);
const navItems = Array.from({ length: 3 }, (_, index) => index);

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-black/[0.08] ${className}`} />;
}

function SkeletonCard() {
  return (
    <article className="min-w-0">
      <div className="aspect-[1.05] rounded-2xl bg-black/[0.08]" />
      <div className="mt-3 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-4 w-1/2" />
      </div>
    </article>
  );
}

export function ListingSkeletonLoader() {
  return (
    <main className="min-h-screen bg-white text-[#1f1b16]">
      <header className="border-b border-black/10 px-6 py-6 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo className="h-7 w-auto" priority />
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <SkeletonBlock className="size-9" />
                <SkeletonBlock className={item === 1 ? "h-4 w-20" : "h-4 w-12"} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold sm:inline">Become a host</span>
            <SkeletonBlock className="size-10" />
            <SkeletonBlock className="size-10" />
          </div>
        </div>

        <section className="mx-auto mt-8 max-w-4xl rounded-full bg-white px-5 py-4 shadow-[0_8px_35px_rgb(0_0_0_/_0.16)] ring-1 ring-black/10">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_1px_1fr_1px_1fr_auto]">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-10" />
              <SkeletonBlock className="h-4 w-44 max-w-full" />
            </div>
            <span className="hidden h-9 w-px bg-black/10 sm:block" />
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-10" />
              <SkeletonBlock className="h-4 w-24" />
            </div>
            <span className="hidden h-9 w-px bg-black/10 sm:block" />
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-10" />
              <SkeletonBlock className="h-4 w-24" />
            </div>
            <div className="grid size-12 place-items-center rounded-full bg-[#083f35] text-white">
              <span className="size-5 animate-pulse rounded-full border-2 border-white/50" />
            </div>
          </div>
        </section>
      </header>

      <section className="px-6 py-10 sm:px-10 lg:px-12">
        <SkeletonBlock className="mb-4 h-7 w-40 rounded-xl" />
        <div className="grid gap-x-3 gap-y-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
          {cards.map((card) => (
            <SkeletonCard key={card} />
          ))}
        </div>
      </section>
    </main>
  );
}
