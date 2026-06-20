import { redirect } from "next/navigation";
import { LocalizationSettings } from "@/components/account/localization-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

export default async function LanguagesCurrencyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accountSettings = await getAccountSettings(user);

  return (
    <AccountSettingsShell active="Languages & currency">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Languages & currency</h2>
      <p className="mt-3 text-black/65">Manage the language, currency, and regional formats used across your StayPrimePH account.</p>
      <LocalizationSettings initialSettings={accountSettings.localization} />
    </AccountSettingsShell>
  );
}
