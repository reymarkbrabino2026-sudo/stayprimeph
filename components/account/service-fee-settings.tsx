"use client";

import { CircleDollarSign } from "lucide-react";
import { useState } from "react";
import {
  calculateGuestPriceWithMarkup,
  calculateHostPayoutFromTotal,
  calculateStayprimeMarkup,
  calculateStayprimeMarkupFromTotal,
} from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

const nightlyPrice = 10000;
const nights = 3;
const hostSubtotal = nightlyPrice * nights;
const stayprimeMarkup = calculateStayprimeMarkup(hostSubtotal);
const guestTotal = calculateGuestPriceWithMarkup(hostSubtotal);
const verifiedHostPayout = calculateHostPayoutFromTotal(guestTotal);
const verifiedStayprimeShare = calculateStayprimeMarkupFromTotal(guestTotal);

export function ServiceFeeSettings() {
  const [showExample, setShowExample] = useState(true);

  return (
    <>
      <section className="mt-9">
        <h3 className="text-2xl font-semibold">Service fee settings</h3>
        <p className="mt-2 text-black/70">
          StayPrimePH uses one fixed pricing rule: guests pay the host amount plus a 20% StayPrimePH markup.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Markup rate" value="20%" />
          <SummaryTile label="Host payout basis" value="Host price" />
          <SummaryTile label="Guest total" value="Host price + 20%" />
        </div>
        <p className="mt-5 text-sm text-black/60">
          Booking totals, payment review, platform ledger, and host payout screens all use this same fixed markup rule.
        </p>
      </section>

      <div className="mt-6 rounded-2xl border border-black/15 p-6">
        <CircleDollarSign className="text-[#083f35]" />
        <h3 className="mt-8 font-semibold">Fixed 20% markup example</h3>
        <p className="mt-4 text-sm text-black/65">
          This example uses {formatCurrency(nightlyPrice)} per night for {nights} nights.
        </p>
        <button type="button" onClick={() => setShowExample((current) => !current)} className="mt-4 inline-block text-sm font-semibold underline">
          {showExample ? "Hide example" : "Show example"}
        </button>
        {showExample ? (
          <div className="mt-5 rounded-2xl bg-black/[0.02] p-5">
            <h4 className="font-semibold">Guest payment split</h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ExampleTile label="Host price" value={formatCurrency(hostSubtotal)} />
              <ExampleTile label="StayPrimePH markup" value={formatCurrency(stayprimeMarkup)} />
              <ExampleTile label="Guest pays" value={formatCurrency(guestTotal)} />
              <ExampleTile label="Host payout" value={formatCurrency(verifiedHostPayout)} />
            </div>
            <p className="mt-4 text-xs font-medium text-black/55">
              Verified split from guest total: {formatCurrency(verifiedStayprimeShare)} to StayPrimePH and {formatCurrency(verifiedHostPayout)} to the host.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-4">
      <p className="text-sm text-black/60">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ExampleTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-sm text-black/60">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
