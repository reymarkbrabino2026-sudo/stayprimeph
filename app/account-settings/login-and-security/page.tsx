import { Monitor } from "lucide-react";
import { redirect } from "next/navigation";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { LogoutAllDevicesButton } from "@/components/auth/logout-all-devices-button";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AccountSettingsShell active="Login & security">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Login & security</h2>
      <SettingsTabs tabs={[{ label: "Login", href: "/account-settings/login-and-security", active: true }, { label: "Shared access", href: "/account-settings/login-and-security/shared-access" }]} />
      <Section title="Login" />
      <Row title="Passkeys" body="Use your fingerprint, face, or PIN." action="Add" />
      <Row title="Password" body="Not created" action="Create" />
      <Section title="Social accounts" />
      <Row title="Google" body="Connected" action="Disconnect" />
      <Section title="Device history" />
      <div className="flex gap-4 border-b border-black/10 py-6">
        <Monitor size={30} strokeWidth={1.6} />
        <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Current browser session</h3>
            <span className="rounded bg-black/[0.06] px-2 py-1 text-[0.65rem] font-bold uppercase">Current session</span>
            <p className="mt-2 text-sm text-black/65">{user.email}</p>
          </div>
          <LogoutAllDevicesButton />
        </div>
      </div>
      <Section title="Account" />
      <Row title="Account deactivation" body="This action cannot be undone" action="Deactivate" />
    </AccountSettingsShell>
  );
}

function Section({ title }: { title: string }) {
  return <h3 className="mt-10 border-b border-black/10 pb-7 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>;
}

function Row({ title, body, action }: { title: string; body: string; action: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-6 border-b border-black/10 py-6">
      <div><h4 className="font-semibold">{title}</h4><p className="mt-1 text-sm text-black/65">{body}</p></div>
      <button className="text-sm font-semibold underline">{action}</button>
    </div>
  );
}
