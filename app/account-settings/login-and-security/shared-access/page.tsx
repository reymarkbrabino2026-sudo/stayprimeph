import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { AccountSettingsShell, BlackButton, SettingsTabs } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

const accessRows = [
  { title: "Co-host access", body: "Invite someone to help manage reservations, guests, and listing operations." },
  { title: "Emergency access", body: "Choose a trusted contact who can help if you lose access to your account." },
  { title: "Connected apps", body: "Review third-party services that can access your StayPrimePH account." },
];

export default async function SharedAccessPage() {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <AccountSettingsShell active="Login & security">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Login & security</h2>
      <SettingsTabs tabs={[{ label: "Login", href: "/account-settings/login-and-security" }, { label: "Shared access", href: "/account-settings/login-and-security/shared-access", active: true }]} />
      <section className="mt-10 rounded-2xl border border-black/15 p-6">
        <UserPlus className="text-[#083f35]" size={34} strokeWidth={1.7} />
        <h3 className="mt-5 text-2xl font-semibold">Share account access safely</h3>
        <p className="mt-2 text-black/65">Add people only where they need access and keep your login private.</p>
        <BlackButton>Invite someone</BlackButton>
      </section>
      <div className="mt-8">
        {accessRows.map((row) => (
          <div key={row.title} className="grid grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6">
            <div>
              <h3 className="font-semibold">{row.title}</h3>
              <p className="mt-1 text-sm text-black/65">{row.body}</p>
            </div>
            <button className="text-sm font-semibold underline">
              Manage
            </button>
          </div>
        ))}
      </div>
    </AccountSettingsShell>
  );
}
