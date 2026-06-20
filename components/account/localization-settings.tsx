"use client";

import { useMemo, useState, useTransition } from "react";

import { saveLocalizationPreferencesAction } from "@/app/account-settings/actions";
import type { LocalizationPreferenceField, LocalizationPreferencesState } from "@/lib/account-settings-types";

const preferenceOptions: Record<LocalizationPreferenceField, string[]> = {
  language: ["English", "Filipino", "Cebuano", "Spanish", "Japanese", "Korean", "Mandarin Chinese"],
  currency: ["Philippine peso (PHP)", "US dollar (USD)", "Euro (EUR)", "Japanese yen (JPY)", "Korean won (KRW)", "Singapore dollar (SGD)"],
  region: ["Philippines", "United States", "Japan", "South Korea", "Singapore", "Australia", "United Kingdom"],
  measurementUnits: ["Metric", "Imperial"],
  timeZone: ["Asia/Manila", "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney", "Europe/London", "America/Los_Angeles", "America/New_York"],
};

const preferences: Array<{ id: LocalizationPreferenceField; title: string }> = [
  { id: "language", title: "Preferred language" },
  { id: "currency", title: "Preferred currency" },
  { id: "region", title: "Region" },
  { id: "measurementUnits", title: "Measurement units" },
  { id: "timeZone", title: "Time zone" },
];

export function LocalizationSettings({ initialSettings }: { initialSettings: LocalizationPreferencesState }) {
  const [settings, setSettings] = useState(initialSettings);
  const [editing, setEditing] = useState<LocalizationPreferenceField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => currencyPreview(settings.currency), [settings.currency]);

  function startEditing(field: LocalizationPreferenceField) {
    setEditing(field);
    setDraftValue(settings[field]);
    setMessage("");
  }

  function cancelEditing() {
    setEditing(null);
    setDraftValue("");
  }

  function saveDraft(field: LocalizationPreferenceField) {
    const next = { ...settings, [field]: draftValue };
    setSettings(next);
    setMessage("");
    setEditing(null);
    setDraftValue("");

    startTransition(async () => {
      const result = await saveLocalizationPreferencesAction(next);
      if (!result.ok) {
        setSettings(settings);
        setMessage(result.error);
        return;
      }
      setSettings(result.data);
      setMessage("Saved.");
    });
  }

  return (
    <>
      <div className="mt-8">
        {message ? <p className="mb-2 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}
        {preferences.map((item) => {
          const isEditing = editing === item.id;
          return (
            <div key={item.id} className={`border-b border-black/10 py-6 ${isEditing ? "bg-black/[0.015]" : ""}`}>
              <div className="grid grid-cols-[1fr_auto] gap-6">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-black/65">{settings[item.id]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditing(item.id)}
                  disabled={isPending}
                  className="self-start text-sm font-semibold underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEditing ? "Editing" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
                  <label className="block text-sm font-semibold" htmlFor={`localization-${item.id}`}>
                    {item.title}
                  </label>
                  <select
                    id={`localization-${item.id}`}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm outline-none transition focus:border-[#083f35] focus:ring-2 focus:ring-[#083f35]/15"
                  >
                    {preferenceOptions[item.id].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => saveDraft(item.id)}
                      disabled={isPending}
                      className="rounded-full bg-[#222] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/25"
                    >
                      {isPending ? "Saving..." : "Save"}
                    </button>
                    <button type="button" onClick={cancelEditing} className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-black/15 p-6">
        <h3 className="font-semibold">Currency preview</h3>
        <p className="mt-2 text-sm text-black/65">Prices, totals, taxes, and host payouts will display in {preview.code} wherever possible.</p>
        <p className="mt-5 text-2xl font-semibold">{preview.amount} per night</p>
      </div>
    </>
  );
}

function currencyPreview(currency: string) {
  if (currency.includes("(USD)")) return { code: "USD", amount: "USD 50" };
  if (currency.includes("(EUR)")) return { code: "EUR", amount: "EUR 45" };
  if (currency.includes("(JPY)")) return { code: "JPY", amount: "JPY 7,900" };
  if (currency.includes("(KRW)")) return { code: "KRW", amount: "KRW 72,000" };
  if (currency.includes("(SGD)")) return { code: "SGD", amount: "SGD 65" };
  return { code: "PHP", amount: "PHP 2,800" };
}
