import { BrandLogo } from "@/components/brand/brand-logo";

const metrics = Array.from({ length: 4 }, (_, index) => index);
const tabs = Array.from({ length: 5 }, (_, index) => index);
const rows = Array.from({ length: 3 }, (_, index) => index);

function SkeletonLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-black/[0.08] ${className}`} />;
}

function MetricSkeleton() {
  return (
    <article className="rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-[0_10px_28px_rgba(33,23,15,0.06)]">
      <div className="flex items-start gap-3">
        <SkeletonLine className="size-10 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-3 w-28 max-w-full" />
          <SkeletonLine className="h-7 w-16" />
          <SkeletonLine className="h-3 w-36 max-w-full" />
        </div>
      </div>
    </article>
  );
}

function RowSkeleton() {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-5 w-40 max-w-full" />
          <SkeletonLine className="h-3 w-32 max-w-full" />
        </div>
        <SkeletonLine className="h-7 w-20 shrink-0" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#fbf7f2] p-3">
        <SkeletonLine className="h-10 w-full rounded-lg" />
        <SkeletonLine className="h-10 w-full rounded-lg" />
        <SkeletonLine className="h-10 w-full rounded-lg" />
      </div>
    </article>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 pb-24 pt-5 text-[#1f1b16] sm:px-6 lg:px-10">
      <div role="status" aria-label="Loading page" className="mx-auto w-full max-w-7xl animate-pulse">
        <span className="sr-only">Loading page...</span>

        <header className="flex items-center justify-between gap-3">
          <BrandLogo className="h-7 w-auto" priority />
          <div className="flex shrink-0 items-center gap-2">
            <SkeletonLine className="size-10" />
            <SkeletonLine className="size-10" />
          </div>
        </header>

        <section className="mt-7">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="mt-3 h-8 w-64 max-w-full rounded-xl" />
          <SkeletonLine className="mt-3 h-4 w-72 max-w-full" />
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricSkeleton key={metric} />
          ))}
        </section>

        <nav aria-label="Loading ERP sections" className="sticky top-0 z-20 -mx-4 mt-6 overflow-hidden border-y border-black/10 bg-white shadow-[0_12px_32px_rgba(33,23,15,0.08)] sm:static sm:mx-0 sm:rounded-[1.25rem] sm:border">
          <div className="flex overflow-x-hidden md:grid md:grid-cols-5">
            {tabs.map((tab) => (
              <div key={tab} className="flex min-h-16 min-w-[9.5rem] flex-col items-center justify-center gap-2 border-r border-black/10 px-3 py-3 md:min-w-0 md:flex-row">
                <SkeletonLine className="size-5" />
                <SkeletonLine className="h-4 w-24" />
              </div>
            ))}
          </div>
        </nav>

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_16px_42px_rgba(33,23,15,0.08)]">
          <div className="border-b border-black/10 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <SkeletonLine className="size-12 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-6 w-52 max-w-full rounded-xl" />
                <SkeletonLine className="h-4 w-72 max-w-full" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <SkeletonLine className="h-11 w-full rounded-xl" />
              <SkeletonLine className="h-11 w-full rounded-xl" />
              <SkeletonLine className="h-11 w-full rounded-xl" />
            </div>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {rows.map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>

          <div className="hidden p-5 md:block">
            <div className="overflow-hidden rounded-2xl border border-black/10">
              <div className="grid grid-cols-5 gap-4 bg-[#fbf7f2] p-4">
                {tabs.map((tab) => (
                  <SkeletonLine key={tab} className="h-4 w-full rounded-lg" />
                ))}
              </div>
              {rows.map((row) => (
                <div key={row} className="grid grid-cols-5 gap-4 border-t border-black/10 p-4">
                  {tabs.map((tab) => (
                    <SkeletonLine key={tab} className="h-5 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
