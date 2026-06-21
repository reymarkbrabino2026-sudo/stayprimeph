function Block({ className }: { className: string }) {
  return <div className={`animate-pulse bg-black/[0.08] ${className}`} />;
}

export default function Loading() {
  return (
    <main role="status" aria-label="Loading listing" className="min-h-screen bg-white text-[#1f1b16]">
      <span className="sr-only">Loading listing…</span>

      {/* Hero image */}
      <div className="relative">
        <div className="h-[62svh] w-full animate-pulse bg-black/[0.10] sm:h-[72svh]" />

        <header className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-12">
          <div className="h-9 w-28 animate-pulse rounded-full bg-white/45" />
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-full bg-white/45" />
            <div className="size-10 animate-pulse rounded-full bg-white/45" />
          </div>
        </header>

        <div className="absolute bottom-8 left-4 space-y-3 sm:left-6 lg:left-12">
          <div className="h-9 w-64 animate-pulse rounded-xl bg-white/55 sm:h-12 sm:w-[28rem]" />
          <div className="h-4 w-44 animate-pulse rounded-full bg-white/45" />
        </div>
      </div>

      {/* Content + reservation card */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(360px,400px)] lg:gap-16">
          <div className="space-y-10">
            <div className="space-y-3">
              <Block className="h-6 w-1/3 rounded-lg" />
              <Block className="h-4 w-full rounded-full" />
              <Block className="h-4 w-5/6 rounded-full" />
              <Block className="h-4 w-2/3 rounded-full" />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Block className="h-24 rounded-2xl" />
              <Block className="h-24 rounded-2xl" />
              <Block className="h-24 rounded-2xl" />
            </div>

            <div className="space-y-3">
              <Block className="h-5 w-40 rounded-lg" />
              <Block className="h-4 w-full rounded-full" />
              <Block className="h-4 w-11/12 rounded-full" />
              <Block className="h-4 w-3/4 rounded-full" />
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-4 rounded-[1.75rem] border border-black/10 p-6 shadow-[0_18px_50px_rgba(33,23,15,0.10)]">
              <Block className="h-7 w-32 rounded-lg" />
              <Block className="h-12 w-full rounded-xl" />
              <Block className="h-12 w-full rounded-xl" />
              <Block className="h-12 w-full rounded-full" />
              <Block className="mx-auto h-4 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
