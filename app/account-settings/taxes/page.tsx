import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { TaxpayerSettings } from "@/components/account/taxpayer-settings";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

export default async function TaxesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);
  return (
    <AccountSettingsShell active="Taxes">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Taxes</h2>
      <SettingsTabs tabs={[{ label: "Taxpayers", href: "/account-settings/taxes", active: true }, { label: "Tax documents", href: "/account-settings/taxes/tax-documents" }]} />
      <TaxpayerSettings initialFinancial={accountSettings.financial} />
      <section className="mt-16">
        <h3 className="text-2xl font-semibold">Need help?</h3>
        <p className="mt-2">Get answers to questions about taxes in our <Link href="/support" className="font-semibold underline">guest support desk</Link>.</p>
      </section>
    </AccountSettingsShell>
  );
}
