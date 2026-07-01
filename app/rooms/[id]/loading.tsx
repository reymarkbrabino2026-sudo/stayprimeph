import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

function Line({ className }: { className: string }) {
  return <div className={`sk-block ${className}`} />;
}

export default function Loading() {
  return (
    <main role="status" aria-label="Loading listing" className="min-h-screen bg-[#fbfaf7] text-[#1f1f1f]">
      <span className="sr-only">Loading listing…</span>

      {/* Dark hero with transparent header + title, mirroring the listing page */}
      <section className="relative h-screen min-h-[100svh] w-full overflow-hidden bg-[#14120f]">
        <div className="sk-block is-dark absolute inset-0" />

        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-12">
          <BrandLogo variant="white" className="h-9 w-auto" />
          <span className="grid size-10 place-items-center rounded-full bg-white/15 text-white">
            <Menu size={18} />
          </span>
        </header>

        <div className="absolute bottom-10 left-4 z-10 space-y-3 sm:left-8 lg:left-12">
          <div className="h-3.5 w-32 animate-pulse rounded-full bg-white/30" />
          <div className="h-9 w-64 animate-pulse rounded-xl bg-white/40 sm:h-14 sm:w-[30rem]" />
        </div>
      </section>

      {/* Intro */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <section className="flex flex-col items-center gap-4 border-b border-black/10 py-14 text-center sm:py-16">
          <Line className="h-3.5 w-28 rounded-full" />
          <Line className="h-7 w-full max-w-2xl rounded-lg sm:h-9" />
          <Line className="h-7 w-3/4 max-w-xl rounded-lg sm:h-9" />
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Line className="h-10 w-32 rounded-full" />
            <Line className="h-10 w-28 rounded-full" />
            <Line className="h-10 w-36 rounded-full" />
          </div>
        </section>

        {/* Content + sticky booking card */}
        <section className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_minmax(360px,400px)] lg:gap-16">
          <div className="space-y-10">
            <div className="space-y-3">
              <Line className="h-4 w-24 rounded-full" />
              <Line className="h-4 w-full rounded-full" />
              <Line className="h-4 w-5/6 rounded-full" />
              <Line className="h-4 w-2/3 rounded-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Line className="h-24 rounded-2xl" />
              <Line className="h-24 rounded-2xl" />
              <Line className="h-24 rounded-2xl" />
            </div>
            <div className="space-y-3">
              <Line className="h-5 w-40 rounded-lg" />
              <Line className="h-4 w-full rounded-full" />
              <Line className="h-4 w-11/12 rounded-full" />
              <Line className="h-4 w-3/4 rounded-full" />
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-4 rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(33,23,15,0.10)]">
              <Line className="h-7 w-32 rounded-lg" />
              <Line className="h-12 w-full rounded-xl" />
              <Line className="h-12 w-full rounded-xl" />
              <Line className="h-12 w-full rounded-full" />
              <Line className="mx-auto h-4 w-2/3 rounded-full" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
