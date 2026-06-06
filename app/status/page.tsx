import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "System Status",
  description: "StayPrimePH system readiness and service status overview.",
  alternates: { canonical: `${env.NEXT_PUBLIC_APP_URL}/status` },
};

export default function StatusPage() {
  const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const hasVercelBlob = Boolean(process.env.PHOTO_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN);
  const hasPhotoStorage = hasCloudinary || hasVercelBlob;
  const services = [
    ["Web app", "Operational", "Core browsing, search, dashboards, and listing pages."],
    ["Authentication", "Operational", "Login, registration, password reset, and email verification paths are implemented."],
    ["Photo uploads", hasPhotoStorage ? "Operational" : "Configuration needed", "Cloudinary or Vercel Blob is required for hosted production uploads."],
    ["Payments", "Configuration needed", "Stripe test keys and webhook are required for online checkout testing."],
    ["Email", "Configuration needed", "Resend sender/domain must be configured for real delivery."],
    ["Monitoring", "Configuration needed", "Sentry, analytics, and provider alerts must be connected in deployment."],
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <p className="text-sm font-semibold text-rose-600">Status</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">System readiness</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
          This screen shows what is working in code and what still needs live provider configuration before launch.
        </p>

        <div className="mt-10 overflow-hidden rounded-[2rem] border bg-white shadow-sm">
          {services.map(([name, status, detail], index) => (
            <section key={name} className={`grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:p-6 ${index > 0 ? "border-t" : ""}`}>
              <div>
                <h2 className="font-semibold">{name}</h2>
                <p className="mt-1 text-sm leading-6 text-black/60">{detail}</p>
              </div>
              <span
                className={`h-fit rounded-full px-3 py-1 text-sm font-semibold ${
                  status === "Operational" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
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
