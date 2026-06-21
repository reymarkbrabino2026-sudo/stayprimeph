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
    <div className="flex min-h-dvh flex-col bg-white">
      <Navbar />

      <section className="relative flex min-h-[44rem] flex-1 items-center justify-center overflow-hidden border-b p-4 sm:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/become-a-host-bg.webp')" }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#06302a]/65 via-[#06302a]/40 to-[#06302a]/75" />

        <div className="relative z-10 w-full max-w-lg">
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
