import { redirect } from "next/navigation";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

const preferences = [
  { title: "Preferred language", value: "English" },
  { title: "Preferred currency", value: "Philippine peso (PHP)" },
  { title: "Region", value: "Philippines" },
  { title: "Measurement units", value: "Metric" },
  { title: "Time zone", value: "Asia/Manila" },
];

export default async function LanguagesCurrencyPage() {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <AccountSettingsShell active="Languages & currency">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Languages & currency</h2>
      <p className="mt-3 text-black/65">Manage the language, currency, and regional formats used across your StayPrimePH account.</p>
      <div className="mt-8">
        {preferences.map((item) => (
          <div key={item.title} className="grid grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6">
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-black/65">{item.value}</p>
            </div>
            <button className="text-sm font-semibold underline">
              Edit
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-black/15 p-6">
        <h3 className="font-semibold">Currency preview</h3>
        <p className="mt-2 text-sm text-black/65">Prices, totals, taxes, and host payouts will display in PHP wherever possible.</p>
        <p className="mt-5 text-2xl font-semibold">PHP 2,800 per night</p>
      </div>
    </AccountSettingsShell>
  );
}
