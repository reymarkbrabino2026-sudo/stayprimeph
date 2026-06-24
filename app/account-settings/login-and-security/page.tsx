import { KeyRound, Monitor, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { revokeAccountSession, revokeOtherAccountSessions } from "@/app/account-settings/login-and-security/actions";
import { PasskeySettings } from "@/components/account/passkey-settings";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { LogoutAllDevicesButton } from "@/components/auth/logout-all-devices-button";
import { getCurrentAuthSession, getCurrentUser, listActiveSessionsForUser } from "@/lib/auth";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { listPasskeysForUser, publicPasskey } from "@/lib/passkeys";
import type { AuthSession } from "@/lib/types";

function formatDateTime(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function deviceLabel(session: AuthSession) {
  const agent = session.userAgent ?? "";
  if (/iphone|android|mobile/i.test(agent)) return "Mobile browser";
  if (/ipad|tablet/i.test(agent)) return "Tablet browser";
  if (/windows|macintosh|linux|cros/i.test(agent)) return "Desktop browser";
  return "Browser session";
}

export default async function LoginSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [sessions, currentSession, csrfToken, passkeys] = await Promise.all([
    listActiveSessionsForUser(user.id),
    getCurrentAuthSession(),
    getCsrfToken(),
    listPasskeysForUser(user.id),
  ]);
  const currentSessionId = currentSession?.id;
  const otherSessionCount = sessions.filter((session) => session.id !== currentSessionId).length;
  const privilegedMfaEnabled = user.role === "admin" || user.role === "host";

  return (
    <AccountSettingsShell active="Login & security">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Login & security</h2>
      <SettingsTabs tabs={[{ label: "Login", href: "/account-settings/login-and-security", active: true }, { label: "Shared access", href: "/account-settings/login-and-security/shared-access" }]} />

      <Section title="Login" />
      <div className="grid gap-0 border-b border-black/10">
        <InfoRow
          icon={<KeyRound size={24} strokeWidth={1.7} />}
          title="Password"
          body={user.passwordHash ? "Password sign-in is enabled." : "This account uses social sign-in."}
        />
        <InfoRow
          icon={<ShieldCheck size={24} strokeWidth={1.7} />}
          title="Multi-factor verification"
          body={privilegedMfaEnabled ? `${user.role === "admin" ? "Admin" : "Host"} sign-ins require an emailed 6-digit code.` : "Required automatically if this account becomes a host or admin."}
        />
      </div>

      <Section title="Passkeys" />
      <PasskeySettings initialPasskeys={passkeys.map(publicPasskey)} csrfToken={csrfToken} canAddPasskey={Boolean(user.emailVerifiedAt)} />

      <Section title="Devices" />
      <div className="flex flex-col gap-4 border-b border-black/10 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Active sessions</h3>
          <p className="mt-1 text-sm text-black/65">{sessions.length} active {sessions.length === 1 ? "session" : "sessions"} for {user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={revokeOtherAccountSessions}>
            <input type="hidden" name={csrfFieldName} value={csrfToken} />
            <button
              className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
              disabled={otherSessionCount === 0}
            >
              Log out other devices
            </button>
          </form>
          <LogoutAllDevicesButton />
        </div>
      </div>

      <div className="divide-y divide-black/10">
        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          return (
            <div key={session.id} className="flex gap-4 py-6">
              <Monitor size={30} strokeWidth={1.6} />
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{deviceLabel(session)}</h3>
                    {isCurrent ? <span className="rounded bg-black/[0.06] px-2 py-1 text-[0.65rem] font-bold uppercase">Current session</span> : null}
                    {session.mfaRole === "admin" || session.mfaRole === "host" ? <span className="rounded bg-emerald-50 px-2 py-1 text-[0.65rem] font-bold uppercase text-emerald-700">MFA verified</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-black/65">{session.userAgent || "Unknown browser"}</p>
                  <p className="mt-1 text-xs text-black/50">Created {formatDateTime(session.createdAt)} · Last seen {formatDateTime(session.lastSeenAt ?? session.createdAt)}</p>
                  <p className="mt-1 text-xs text-black/50">Network {session.ipAddress || "Unavailable"} · Expires {formatDateTime(session.expiresAt)}</p>
                </div>
                <form action={revokeAccountSession}>
                  <input type="hidden" name={csrfFieldName} value={csrfToken} />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50">
                    {isCurrent ? "Log out this device" : "Revoke"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <Section title="Account" />
      <InfoRow title="Account deactivation" body="Request deletion from Privacy settings when you are ready to close this account." />
    </AccountSettingsShell>
  );
}

function Section({ title }: { title: string }) {
  return <h3 className="mt-10 border-b border-black/10 pb-7 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>;
}

function InfoRow({ icon, title, body }: { icon?: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4 py-6">
      {icon ? <div className="pt-0.5">{icon}</div> : null}
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm text-black/65">{body}</p>
      </div>
    </div>
  );
}
