'use client';

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { signUpHost } from "@/app/auth/actions";
import { PasswordInput } from "@/components/forms/password-input";

export function HostSignupFlow({ error, message }: { error?: string; message?: string }) {
  const [step, setStep] = useState<"details" | "commitment">("details");
  const [details, setDetails] = useState({ firstName: "", lastName: "", birthDate: "", email: "", password: "" });

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="relative min-h-[32rem] overflow-hidden border-b bg-[#06302a]">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute -left-28 -top-24 size-[26rem] rounded-full bg-[#0f7a65] opacity-50 blur-[120px]" />
          <div className="absolute -right-32 top-8 size-[32rem] rounded-full bg-[#1aa088] opacity-40 blur-[130px]" />
          <div className="absolute -bottom-40 left-1/4 size-[34rem] rounded-full bg-[#c9a15a] opacity-25 blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 size-[22rem] rounded-full bg-[#0b5d4e] opacity-50 blur-[110px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.10),transparent_55%)]" />
        </div>

        <div className="relative z-10 flex min-h-[32rem] items-center justify-center p-4 sm:p-6">
          {step === "details" ? (
            <div className="max-h-[min(76vh,40rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_18px_60px_rgb(0_0_0_/_0.2)] sm:p-6">
              <div className="flex items-center justify-between">
                <Link href="/login?role=host" className="text-2xl" aria-label="Back">
                  &larr;
                </Link>
              </div>

              <div className="mt-4 text-center">
                <h1 className="text-2xl font-bold sm:text-3xl">Let&apos;s create your account</h1>
                <p className="mt-2 text-sm text-black/60 sm:text-base">This information is required to book or host.</p>
              </div>

              <div className="mt-7 space-y-5">
                {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
                <section>
                  <h2 className="mb-3 font-semibold">Legal name</h2>
                  <div className="overflow-hidden rounded-2xl border">
                    <input value={details.firstName} onChange={(event) => setDetails((current) => ({ ...current, firstName: event.target.value }))} className="min-h-14 w-full border-b px-4 outline-none" placeholder="First name" />
                    <input value={details.lastName} onChange={(event) => setDetails((current) => ({ ...current, lastName: event.target.value }))} className="min-h-14 w-full px-4 outline-none" placeholder="Last name" />
                  </div>
                  <p className="mt-2 text-sm text-black/55">
                    Make sure it matches the name on your government ID. If you go by another name, you can add a preferred first name.
                  </p>
                </section>

                <label className="block">
                  <span className="mb-3 block font-semibold">Date of birth</span>
                  <input value={details.birthDate} onChange={(event) => setDetails((current) => ({ ...current, birthDate: event.target.value }))} type="date" className="min-h-14 w-full rounded-2xl border px-4 outline-none" />
                </label>

                <label className="block">
                  <span className="mb-3 block font-semibold">Email</span>
                  <input value={details.email} onChange={(event) => setDetails((current) => ({ ...current, email: event.target.value }))} type="email" className="min-h-14 w-full rounded-2xl border px-4 outline-none" placeholder="Email" />
                  <span className="mt-2 block text-sm text-black/55">We&apos;ll email you trip confirmations and receipts.</span>
                </label>

                <div>
                  <label htmlFor="host-signup-password" className="mb-3 block font-semibold">Password</label>
                  <PasswordInput id="host-signup-password" value={details.password} onChange={(event) => setDetails((current) => ({ ...current, password: event.target.value }))} className="min-h-14 w-full rounded-2xl border px-4 outline-none" placeholder="Create a password" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("commitment")}
                className="mt-6 min-h-12 w-full rounded-2xl bg-[#083f35] px-5 py-3 font-semibold text-white transition active:scale-[0.99]"
              >
                Agree and continue
              </button>
            </div>
          ) : (
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_60px_rgb(0_0_0_/_0.2)] sm:p-6">
              <button type="button" onClick={() => setStep("details")} className="block text-2xl" aria-label="Back">
                &larr;
              </button>
              <div className="mx-auto mt-3 grid h-12 w-12 place-items-center rounded-full border-2 border-[#083f35] text-[#083f35]">
                <span aria-hidden="true" className="h-4 w-4 rotate-45 border-2 border-current" />
              </div>
              <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Everyone belongs here</h1>
              <p className="mx-auto mt-5 max-w-sm text-black/75">
                When you join StayPrimePH, we ask you to agree to our <span className="font-semibold underline">Community Commitment</span>:
              </p>
              <p className="mx-auto mt-5 max-w-md text-black/85">
                I will treat everyone in the community - regardless of race, religion, national origin, ethnicity, skin color, disability, sex, gender identity, sexual orientation, or age - with respect and without judgment or bias.
              </p>
              <form action={signUpHost}>
                <input type="hidden" name="name" value={`${details.firstName} ${details.lastName}`.trim()} />
                <input type="hidden" name="email" value={details.email} />
                <input type="hidden" name="password" value={details.password} />
                <button className="mt-7 min-h-12 w-full rounded-2xl bg-[#083f35] px-5 py-3 font-semibold text-white transition active:scale-[0.99]">
                  Agree and continue
                </button>
              </form>
              <button type="button" onClick={() => setStep("details")} className="mt-4 font-semibold">
                Decline
              </button>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
