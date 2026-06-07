"use client";

import { Check, Download, HeartHandshake } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveFinancialSettingsAction } from "@/app/account-settings/actions";
import type { DonationPreference, FinancialSettingsState } from "@/lib/account-settings-types";

type DonationRecord = {
  id: string;
  date: string;
  nonprofit: string;
  amount: number;
  source: string;
};

const nonprofitOptions = ["StayPrimePH Open Doors Fund", "Philippine Red Cross", "Habitat for Humanity Philippines", "Local community stays"];

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export function DonationSettings({ initialFinancial }: { initialFinancial: FinancialSettingsState }) {
  const [financial, setFinancial] = useState(initialFinancial);
  const preference = financial.donationPreference;
  const [draft, setDraft] = useState(preference);
  const [editing, setEditing] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const donationAmount = Number.parseInt(preference.amount, 10) || 0;
  const history = useMemo<DonationRecord[]>(() => {
    if (!preference.recurring || donationAmount <= 0) return [];
    return [
      { id: "DON-1038", date: "2026-05-24", nonprofit: preference.nonprofit, amount: donationAmount, source: preference.applyTo },
      { id: "DON-1022", date: "2026-04-18", nonprofit: preference.nonprofit, amount: donationAmount, source: preference.applyTo },
    ];
  }, [donationAmount, preference.applyTo, preference.nonprofit, preference.recurring]);

  function savePreference(next: DonationPreference, onSaved?: () => void) {
    const nextFinancial = { ...financial, donationPreference: next };
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
      setDraft(result.data.donationPreference);
      setMessage("Saved.");
      onSaved?.();
    });
  }

  function toggleRecurring() {
    savePreference({ ...preference, recurring: !preference.recurring });
  }

  function openSetup() {
    setDraft(preference);
    setEditing(true);
  }

  function saveDraft() {
    const amount = String(Math.max(1, Number.parseInt(draft.amount, 10) || 0));
    savePreference({ ...draft, amount, recurring: true }, () => setEditing(false));
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stayprimeph-donation-history.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mt-8 border-y border-black/10 py-6">
        {message ? <p className="mb-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        <button type="button" role="switch" aria-checked={preference.recurring} onClick={toggleRecurring} disabled={isPending} className="grid w-full grid-cols-[1fr_auto] gap-6 text-left disabled:cursor-not-allowed disabled:opacity-60">
          <span>
            <span className="block font-semibold">Recurring donation</span>
            <span className="mt-1 block text-sm text-black/65">Automatically add a small donation when eligible transactions are completed.</span>
            {preference.recurring ? (
              <span className="mt-2 block text-sm font-medium text-[#083f35]">
                {money(donationAmount)} to {preference.nonprofit} on eligible {preference.applyTo.toLowerCase()}.
              </span>
            ) : null}
          </span>
          <span className={`relative inline-flex h-8 w-12 shrink-0 items-center rounded-full transition ${preference.recurring ? "bg-[#222]" : "bg-black/45"}`}>
            <span className={`grid size-7 place-items-center rounded-full bg-white shadow transition ${preference.recurring ? "translate-x-4" : "translate-x-0.5"}`}>
              {preference.recurring ? <Check size={15} strokeWidth={2.4} /> : null}
            </span>
          </span>
        </button>
      </div>

      <section className="mt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">Donation history</h3>
            <p className="mt-2 text-black/65">{history.length > 0 ? "Recent eligible donations are listed below." : "You have not made any donations yet."}</p>
          </div>
          {preference.recurring ? (
            <button type="button" onClick={openSetup} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black">
              Edit
            </button>
          ) : null}
        </div>
        {history.length > 0 ? (
          <div className="mt-5 space-y-3">
            {history.map((record) => (
              <div key={record.id} className="grid gap-3 rounded-2xl border border-black/15 p-4 sm:grid-cols-[1fr_auto]">
                <div className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef8f4] text-[#083f35]">
                    <HeartHandshake size={21} />
                  </span>
                  <span>
                    <span className="block font-semibold">{record.nonprofit}</span>
                    <span className="mt-1 block text-sm text-black/60">
                      {record.id} - {new Date(record.date).toLocaleDateString()} - {record.source}
                    </span>
                  </span>
                </div>
                <span className="font-semibold">{money(record.amount)}</span>
              </div>
            ))}
            <button type="button" onClick={exportHistory} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black">
              <Download size={18} />
              Download history
            </button>
          </div>
        ) : null}
        <PrimaryButton onClick={openSetup}>{preference.recurring ? "Update donation" : "Set up donation"}</PrimaryButton>
        {editing ? (
          <Panel title={preference.recurring ? "Update donation preference" : "Set up donation"}>
            <TextField label="Donation amount" value={draft.amount} onChange={(value) => setDraft({ ...draft, amount: value.replace(/\D/g, "").slice(0, 5) })} />
            <label className="grid gap-2 font-semibold">
              <span>Nonprofit</span>
              <select value={draft.nonprofit} onChange={(event) => setDraft({ ...draft, nonprofit: event.target.value })} className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]">
                {nonprofitOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-semibold">
              <span>Apply donation to</span>
              <select value={draft.applyTo} onChange={(event) => setDraft({ ...draft, applyTo: event.target.value as DonationPreference["applyTo"] })} className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]">
                <option>Bookings</option>
                <option>Payouts</option>
                <option>Both</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-3 pt-1">
              <button type="button" onClick={saveDraft} disabled={isPending || !draft.amount || Number.parseInt(draft.amount, 10) <= 0} className="min-h-11 rounded-xl bg-[#222] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25">
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl border border-black/15 px-5 font-semibold transition hover:border-black">
                Cancel
              </button>
            </div>
          </Panel>
        ) : null}
      </section>

      <div className="mt-8 rounded-2xl border border-black/15 p-6">
        <button type="button" onClick={() => setShowHow((current) => !current)} className="flex w-full items-center justify-between text-left font-semibold">
          How donations work
          <span className="text-sm underline">{showHow ? "Hide" : "Show"}</span>
        </button>
        <p className="mt-2 text-sm text-black/65">Donation settings are optional and can be changed any time before future eligible payments.</p>
        {showHow ? (
          <div className="mt-4 rounded-2xl bg-black/[0.02] p-4 text-sm text-black/65">
            When recurring donations are on, StayPrimePH adds your selected amount to eligible transactions. You can pause donations by turning the switch off, or update the amount and nonprofit anytime.
          </div>
        ) : null}
      </div>
    </>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-7 min-h-12 rounded-xl bg-[#222] px-6 font-semibold text-white transition hover:bg-black">
      {children}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-black/15 bg-black/[0.02] p-5">
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="mt-4 grid gap-4">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 font-semibold">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]"
      />
    </label>
  );
}
