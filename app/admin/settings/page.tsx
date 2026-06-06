import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { adminLinks } from "@/lib/navigation";

export default function AdminSettingsPage() {
  const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const hasVercelBlob = Boolean(process.env.PHOTO_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN);
  const settings = [
    ["App URL", Boolean(process.env.NEXT_PUBLIC_APP_URL), "Public canonical URL for links and auth callbacks."],
    ["Database", Boolean(process.env.DATABASE_URL), "PostgreSQL connection for production persistence."],
    ["Prisma persistence", process.env.PERSISTENCE_DRIVER === "prisma", "Production must use Prisma instead of local JSON files."],
    ["Stripe", Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY), "Checkout, webhook, and public key are configured together."],
    ["Photo storage", hasCloudinary || hasVercelBlob, "Cloudinary or Vercel Blob is configured for durable listing photo uploads."],
    ["Resend email", Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), "Transactional email sender is configured."],
    ["Upstash Redis", Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN), "Distributed rate limiting is configured."],
    ["Sentry", Boolean(process.env.SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN), "Server and browser error monitoring are configured."],
  ] as const;

  return (
    <DashboardShell
      title="System Settings"
      subtitle="Admin dashboard"
      description="Production-critical settings are controlled by environment variables so secrets never pass through the browser."
      links={adminLinks}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {settings.map(([name, ready, description]) => (
          <article key={name} className="rounded-[1.5rem] bg-white p-5 soft-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{name}</h2>
                <p className="mt-2 text-sm leading-6 text-black/55">{description}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {ready ? "Ready" : "Needs setup"}
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 rounded-[1.5rem] border border-dashed bg-white p-5 text-sm leading-6 text-black/60">
        To change these values, update the hosting provider secret manager and redeploy. This prevents accidental exposure of database strings, payment keys, and email credentials.
      </div>
    </DashboardShell>
  );
}
