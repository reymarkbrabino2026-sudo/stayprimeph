import { BrandLogo } from "@/components/brand/brand-logo";

export function LoadingScreen({ label = "Loading StayPrimePH" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#faf7f4] p-6">
      <section className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 text-center soft-card">
        <BrandLogo className="mx-auto h-8 w-auto" priority />
        <div className="mx-auto mt-6 flex size-12 items-center justify-center rounded-full bg-[#083f35]/[0.06]">
          <span className="size-6 animate-spin rounded-full border-2 border-[#083f35]/20 border-t-[#083f35]" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#083f35]">{label}</p>
      </section>
    </main>
  );
}
