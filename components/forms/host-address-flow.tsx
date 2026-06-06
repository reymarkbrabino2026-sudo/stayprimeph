"use client";

import Image from "next/image";
import { ArrowLeft, LocateFixed, Search, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";

type AddressStep = "closed" | "search" | "confirm";

export function HostAddressFlow() {
  const router = useRouter();
  const [step, setStep] = useState<AddressStep>("closed");

  return (
    <main className="min-h-dvh bg-white px-4 py-6 sm:px-8 lg:px-14 lg:py-10">
      <BrandLogo className="h-7 w-auto" />

      <section className="mx-auto mt-10 grid max-w-6xl items-center gap-10 lg:mt-0 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(28rem,36rem)]">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#222] sm:text-5xl lg:text-6xl">
            Set up your
            <br />
            StayPrimePH listing
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-lg text-black/65">
            It&apos;s easy to create a great listing - let&apos;s start with your address.
          </p>
          <button
            type="button"
            onClick={() => setStep("search")}
            className="mx-auto mt-8 flex min-h-12 w-full max-w-md items-center gap-3 rounded-full border px-5 text-left text-black/70 transition hover:border-black"
          >
            <Search size={18} />
            <span>Enter your address</span>
          </button>
        </div>

        <div className="rounded-[3rem] bg-[#eef8f2] p-5 sm:p-8">
          <article className="mx-auto max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-sm">
            <div className="relative aspect-[1.25/1]">
              <Image src="/host-preview-house.jpg" alt="Sample villa" fill className="object-cover" sizes="(min-width: 1024px) 384px, 90vw" />
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-semibold">Entire villa in Siargao, Philippines</h2>
              <div className="mt-5 flex items-center justify-between border-t pt-5 text-sm">
                <span>Hosted by Maya</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200">MS</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {step !== "closed" && (
        <>
          <button
            type="button"
            aria-label="Close address modal"
            onClick={() => setStep("closed")}
            className="fixed inset-0 z-40 bg-black/35"
          />

          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto w-auto max-w-3xl -translate-y-1/2 rounded-[2rem] bg-white p-5 shadow-[0_20px_70px_rgb(0_0_0_/_0.22)] sm:p-6">
            {step === "search" ? (
              <>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep("closed")} aria-label="Close">
                    <X size={18} />
                  </button>
                </div>
                <h2 className="mt-2 text-center text-2xl font-semibold">Enter your address</h2>
                <div className="mt-6 flex min-h-14 items-center gap-3 rounded-full border-2 border-black px-4">
                  <Search size={18} />
                  <input className="w-full outline-none" placeholder="Enter your address" />
                </div>
                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  className="mt-6 flex items-center gap-4 text-left"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/[0.03] text-xl"><LocateFixed size={20} /></span>
                  <span>Use my current location</span>
                </button>
                <div className="h-56 sm:h-72" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setStep("search")} aria-label="Back">
                    <ArrowLeft size={18} />
                  </button>
                  <button type="button" onClick={() => setStep("closed")} aria-label="Close">
                    <X size={18} />
                  </button>
                </div>

                <h2 className="mt-3 text-center text-2xl font-semibold">Confirm your address</h2>

                <div className="mt-6 rounded-2xl bg-black/[0.03] p-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 text-red-600">!</span>
                    <div>
                      <p className="font-semibold">We couldn&apos;t find your exact location</p>
                      <p className="text-sm text-black/60">Please enter your address instead.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border">
                  <label className="block border-b px-4 py-3 text-sm text-black/55">
                    Country / region
                    <select defaultValue="Philippines - PH" className="mt-1 block w-full bg-white text-base text-black outline-none">
                      <option>Philippines - PH</option>
                    </select>
                  </label>
                  {[
                    "Unit, level, etc. (if applicable)",
                    "Building name (if applicable)",
                    "Street address",
                    "Barangay / district (if applicable)",
                    "City / municipality",
                    "Province",
                    "Postal code",
                  ].map((label) => (
                    <label key={label} className="block border-b px-4 py-3 last:border-b-0">
                      {label === "Street address" && <span className="block text-xs font-semibold text-red-600">{label}</span>}
                      <input
                        className="w-full outline-none placeholder:text-black/50"
                        placeholder={label === "Street address" ? "Greenhouse, Brgy. Mamacao" : label}
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/become-a-host/setup")}
                  className="mt-6 min-h-12 w-full rounded-2xl bg-[#222] px-5 py-3 font-semibold text-white"
                >
                  Next
                </button>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
