"use client";

import { CircleDollarSign } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveFinancialSettingsAction } from "@/app/account-settings/actions";
import type { FinancialSettingsState, ServiceFeeMode } from "@/lib/account-settings-types";

const nightlyPrice = 10000;
const nights = 3;
const subtotal = nightlyPrice * nights;

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export function ServiceFeeSettings({ initialFinancial }: { initialFinancial: FinancialSettingsState }) {
  const [financial, setFinancial] = useState(initialFinancial);
  const savedMode = financial.serviceFeeMode;
  const [draftMode, setDraftMode] = useState<ServiceFeeMode | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedMode = draftMode ?? savedMode;
  const changed = selectedMode !== savedMode;
  const example = useMemo(() => {
    const hostFee = selectedMode === "single" ? subtotal * 0.155 : subtotal * 0.03;
    const guestServiceFee = selectedMode === "single" ? 0 : subtotal * 0.145;
    return {
      hostFee,
      guestServiceFee,
      hostPayout: subtotal - hostFee,
      guestTotal: subtotal + guestServiceFee,
    };
  }, [selectedMode]);

  function save() {
    const nextFinancial = { ...financial, serviceFeeMode: selectedMode };
    const previous = financial;
    setFinancial(nextFinancial);
    setMessage("");
    startTransition(async () => {
      const result = await saveFinancialSettingsAction(nextFinancial);
      if (!result.ok) {
        setFinancial(previous);
        setMessage(result.error);
        return;
      }

      setFinancial(result.data);
      setDraftMode(null);
      setMessage("Saved.");
    });
  }

  function cancel() {
    setDraftMode(null);
  }

  return (
    <>
      <section className="mt-9">
        {message ? <p className="mb-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        <h3 className="text-2xl font-semibold">Service fee settings</h3>
        <p className="mt-2">Choose a service fee pricing option for all of your listings.</p>
        <FeeOption
          mode="single"
          selected={selectedMode === "single"}
          current={savedMode === "single"}
          title="Single fee"
          badge="Recommended"
          body="StayPrimePH will deduct 15.5% from each payout. Guests won't be charged a service fee, the price you set is the price guests get."
          onSelect={setDraftMode}
        />
        <FeeOption
          mode="split"
          selected={selectedMode === "split"}
          current={savedMode === "split"}
          title="Split fee"
          badge="Current setting"
          body="StayPrimePH deducts 3% from your earnings, and guests pay a 14.1%-16.5% service fee on top of all host charges, including nightly prices, cleaning fees, and pet fees."
          onSelect={setDraftMode}
        />
        <p className="mt-10 text-sm text-black/65">For listings located in Brazil, StayPrimePH deducts a 16% host fee for single fee and 4% host fee for split fee.</p>
      </section>

      <div className="mt-6 rounded-2xl border border-black/15 p-6">
        <CircleDollarSign className="text-[#083f35]" />
        <h3 className="mt-8 font-semibold">Same payout, simpler pricing</h3>
        <p className="mt-4 text-sm text-black/65">You can make the same amount of money and your guests won&apos;t pay more. Just choose single fee and adjust your prices accordingly.</p>
        <button type="button" onClick={() => setShowExample((current) => !current)} className="mt-4 inline-block text-sm font-semibold underline">
          Check out an example
        </button>
        {showExample ? (
          <div className="mt-5 rounded-2xl bg-black/[0.02] p-5">
            <h4 className="font-semibold">{selectedMode === "single" ? "Single fee example" : "Split fee example"}</h4>
            <p className="mt-2 text-sm text-black/65">Example based on {money(nightlyPrice)} per night for {nights} nights.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ExampleTile label="Guest pays" value={money(example.guestTotal)} />
              <ExampleTile label="Host payout" value={money(example.hostPayout)} />
              <ExampleTile label="Host fee" value={money(example.hostFee)} />
              <ExampleTile label="Guest service fee" value={money(example.guestServiceFee)} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 border-t border-black/10 pt-6">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !changed}
          className="min-h-12 rounded-xl bg-[#222] px-10 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/[0.06] disabled:text-black/25"
        >
          Save
        </button>
        <button type="button" onClick={cancel} disabled={isPending || !changed} className="min-h-12 rounded-xl bg-black/[0.06] px-10 font-semibold disabled:cursor-not-allowed disabled:text-black/25">
          Cancel
        </button>
        <span className="self-center text-sm font-medium text-black/60">
          {changed ? "You have unsaved changes." : `Current setting: ${savedMode === "single" ? "Single fee" : "Split fee"}`}
        </span>
      </div>
    </>
  );
}

function FeeOption({
  mode,
  selected,
  current,
  title,
  body,
  badge,
  onSelect,
}: {
  mode: ServiceFeeMode;
  selected: boolean;
  current: boolean;
  title: string;
  body: string;
  badge: string;
  onSelect: (mode: ServiceFeeMode) => void;
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={() => onSelect(mode)} className="mt-8 flex w-full gap-4 rounded-2xl border border-transparent p-3 text-left transition hover:border-black/10 hover:bg-black/[0.02]">
      <span className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full border ${selected ? "border-[#222]" : "border-black/20"}`}>
        {selected ? <span className="size-3 rounded-full bg-[#222]" /> : null}
      </span>
      <span>
        <span className="font-semibold">
          {title} <span className="ml-1 rounded bg-black/10 px-1 text-xs font-bold uppercase">{current ? "Current setting" : badge}</span>
        </span>
        <span className="mt-1 block text-sm text-black/65">{body}</span>
      </span>
    </button>
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
