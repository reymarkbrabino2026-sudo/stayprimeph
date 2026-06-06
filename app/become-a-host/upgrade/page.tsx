import Link from "next/link";
import { redirect } from "next/navigation";
import { continueAsHost } from "@/app/become-a-host/upgrade/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getCurrentUser } from "@/lib/auth";

export default async function BecomeAHostUpgradePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/register?role=host");
  if (user.role === "host") redirect("/become-a-host/setup");
  if (user.role !== "guest") redirect("/login?role=host");

  return (
    <main className="min-h-dvh bg-[#fbfaf7] text-[#1f1f1f]">
      <header className="flex h-20 items-center justify-between border-b border-black/10 bg-white px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="StayPrimePH home">
          <BrandLogo variant="green" className="h-7 w-auto" priority />
        </Link>
        <Link href="/guest/dashboard" className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:border-black">
          Not now
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl flex-col justify-center px-5 py-14 text-center sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Become a host</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#083f35] sm:text-6xl">
          Add hosting tools to your StayPrimePH account.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-black/65">
          You can keep using this account for travel and start hosting from the same profile. We will unlock the host dashboard, listing tools, and booking management for you.
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {[
            ["Keep your account", "No second login or duplicate profile."],
            ["Create listings", "Add photos, pricing, rules, and availability."],
            ["Manage hosting", "Review bookings, earnings, messages, and reviews."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-black/60">{body}</p>
            </article>
          ))}
        </div>

        <form action={continueAsHost} className="mt-8">
          <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#083f35] px-8 font-semibold text-white transition hover:bg-[#062f28]">
            Continue as host
          </button>
        </form>
      </section>
    </main>
  );
}
