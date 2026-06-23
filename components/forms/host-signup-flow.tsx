'use client';

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { signUpHost } from "@/app/auth/actions";
import { AuthSubmitButton } from "@/components/forms/auth-submit-button";
import { PasswordInput } from "@/components/forms/password-input";
import { evaluatePasswordRules, passwordRulesPass } from "@/lib/password-policy";

type HostSignupDetails = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateDetails(details: HostSignupDetails) {
  const firstName = details.firstName.trim();
  const lastName = details.lastName.trim();
  const email = details.email.trim().toLowerCase();
  const name = `${firstName} ${lastName}`.trim();

  if (firstName.length < 2 || lastName.length < 2) return "Enter your first and last legal name.";
  if (!details.birthDate) return "Enter your date of birth.";
  if (!isValidEmail(email)) return "Enter a valid email address.";
  if (!passwordRulesPass(evaluatePasswordRules(details.password, { email, name }))) {
    return "Use a stronger password that meets all requirements.";
  }
  if (details.password !== details.confirmPassword) return "Passwords do not match.";

  return null;
}

export function HostSignupFlow({ error, message, nextPath }: { error?: string; message?: string; nextPath?: string }) {
  const [step, setStep] = useState<"details" | "commitment">("details");
  const [details, setDetails] = useState({ firstName: "", lastName: "", birthDate: "", email: "", password: "", confirmPassword: "" });
  const [clientError, setClientError] = useState<string | null>(null);
  const loginHref = `/login?${new URLSearchParams({ role: "host", ...(nextPath ? { next: nextPath } : {}) }).toString()}`;
  const fullName = `${details.firstName} ${details.lastName}`.trim();

  function updateDetail<Key extends keyof HostSignupDetails>(key: Key, value: HostSignupDetails[Key]) {
    setDetails((current) => ({ ...current, [key]: value }));
    if (clientError) setClientError(null);
  }

  function continueToCommitment() {
    const validationError = validateDetails(details);
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setStep("commitment");
  }

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
                <Link href={loginHref} className="text-2xl" aria-label="Back to host login">
                  &larr;
                </Link>
              </div>

              <div className="mt-4 text-center">
                <h1 className="text-2xl font-bold sm:text-3xl">Let&apos;s create your account</h1>
                <p className="mt-2 text-sm text-black/60 sm:text-base">This information is required to book or host.</p>
              </div>

              <div className="mt-7 space-y-5">
                {(clientError || error) && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{clientError ?? error}</p>}
                {message && <p role="status" className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
                <section>
                  <h2 className="mb-3 font-semibold">Legal name</h2>
                  <div className="overflow-hidden rounded-2xl border">
                    <input value={details.firstName} onChange={(event) => updateDetail("firstName", event.target.value)} className="min-h-14 w-full border-b px-4 outline-none" placeholder="First name" autoComplete="given-name" required />
                    <input value={details.lastName} onChange={(event) => updateDetail("lastName", event.target.value)} className="min-h-14 w-full px-4 outline-none" placeholder="Last name" autoComplete="family-name" required />
                  </div>
                  <p className="mt-2 text-sm text-black/55">
                    Make sure it matches the name on your government ID. If you go by another name, you can add a preferred first name.
                  </p>
                </section>

                <label className="block">
                  <span className="mb-3 block font-semibold">Date of birth</span>
                  <input value={details.birthDate} onChange={(event) => updateDetail("birthDate", event.target.value)} type="date" className="min-h-14 w-full rounded-2xl border px-4 outline-none" required />
                </label>

                <label className="block">
                  <span className="mb-3 block font-semibold">Email</span>
                  <input value={details.email} onChange={(event) => updateDetail("email", event.target.value)} type="email" className="min-h-14 w-full rounded-2xl border px-4 outline-none" placeholder="Email" autoComplete="email" required />
                  <span className="mt-2 block text-sm text-black/55">We&apos;ll email you trip confirmations and receipts.</span>
                </label>

                <div>
                  <label htmlFor="host-signup-password" className="mb-3 block font-semibold">Password</label>
                  <PasswordInput id="host-signup-password" value={details.password} onChange={(event) => updateDetail("password", event.target.value)} className="min-h-14 w-full rounded-2xl border px-4 outline-none" placeholder="Create a password" minLength={12} autoComplete="new-password" aria-describedby="host-password-help" required />
                  <p id="host-password-help" className="mt-2 text-sm text-black/55">Use 12+ characters with uppercase, lowercase, a number, and a symbol. Avoid your name or email.</p>
                </div>

                <div>
                  <label htmlFor="host-signup-confirm-password" className="mb-3 block font-semibold">Confirm password</label>
                  <PasswordInput id="host-signup-confirm-password" value={details.confirmPassword} onChange={(event) => updateDetail("confirmPassword", event.target.value)} className="min-h-14 w-full rounded-2xl border px-4 outline-none" placeholder="Confirm your password" minLength={12} autoComplete="new-password" required />
                </div>
              </div>

              <button
                type="button"
                onClick={continueToCommitment}
                className="mt-6 min-h-12 w-full rounded-2xl bg-[#083f35] px-5 py-3 font-semibold text-white transition active:scale-[0.99]"
              >
                Agree and continue
              </button>
              <p className="mt-4 text-center text-sm text-black/60">
                Already have a host account?{" "}
                <Link href={loginHref} className="font-semibold text-[#a8431f]">
                  Log in
                </Link>
              </p>
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
                <input type="hidden" name="name" value={fullName} />
                <input type="hidden" name="email" value={details.email} />
                <input type="hidden" name="password" value={details.password} />
                <input type="hidden" name="confirmPassword" value={details.confirmPassword} />
                {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
                <AuthSubmitButton label="Agree and continue" pendingLabel="Creating account" variant="host" />
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
