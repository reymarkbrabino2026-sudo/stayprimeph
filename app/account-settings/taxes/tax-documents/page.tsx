import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function TaxDocumentsPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <AccountSettingsShell active="Taxes">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Taxes</h2>
      <SettingsTabs tabs={[{ label: "Taxpayers", href: "/account-settings/taxes" }, { label: "Tax documents", href: "/account-settings/taxes/tax-documents", active: true }]} />
      <Link href="#" className="mt-16 flex items-center justify-between">
        <span><strong className="text-2xl">Invoices</strong><br />Download tax invoices for hosts by month for past and current bookings.</span>
        <ChevronRight />
      </Link>
      <section className="mt-16">
        <h3 className="text-2xl font-semibold">Documents</h3>
        <p className="mt-2">Review and download documents often required for tax filings. Detailed earnings information is available in your <Link href="/host/earnings" className="font-semibold underline">earnings reports</Link>.</p>
      </section>
      <div className="mt-12">
        {[2025, 2024, 2023, 2022].map((year) => (
          <div key={year} className="border-t border-black/10 py-10"><h3 className="text-2xl font-semibold">{year}</h3><p className="mt-2 text-black/65">No tax document issued</p></div>
        ))}
      </div>
      <p>For tax documents issued prior to 2022, <Link href="/support" className="font-semibold underline">contact us</Link>.</p>
      <section className="mt-16">
        <h3 className="text-2xl font-semibold">Need help?</h3>
        <p className="mt-2">Get answers to questions about taxes in our <Link href="/support" className="font-semibold underline">guest support desk</Link>.</p>
      </section>
    </AccountSettingsShell>
  );
}
