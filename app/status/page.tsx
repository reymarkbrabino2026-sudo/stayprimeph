import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "System Status",
  description: "StayPrimePH public service status overview.",
  alternates: { canonical: `${env.NEXT_PUBLIC_APP_URL}/status` },
};

export default function StatusPage() {
  const services = [
    ["StayPrimePH platform", "Operational", "Public website, account access, and core booking pages are available."],
    ["Guest experience", "Operational", "Search, listing pages, wishlists, trips, and guest messaging are available."],
    ["Host tools", "Operational", "Host dashboard, listings, calendar, bookings, and reports are available."],
    ["Support", "Operational", "Help and support request pages are available."],
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <p className="text-sm font-semibold text-rose-600">Status</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">System readiness</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
          This screen shows a public summary of StayPrimePH availability. Internal provider readiness, credentials, and launch configuration are only reviewed by authorized operators.
        </p>

        <div className="mt-10 overflow-hidden rounded-[2rem] border bg-white shadow-sm">
          {services.map(([name, status, detail], index) => (
            <section key={name} className={`grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:p-6 ${index > 0 ? "border-t" : ""}`}>
              <div>
                <h2 className="font-semibold">{name}</h2>
                <p className="mt-1 text-sm leading-6 text-black/60">{detail}</p>
              </div>
              <span
                className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
              >
                {status}
              </span>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
