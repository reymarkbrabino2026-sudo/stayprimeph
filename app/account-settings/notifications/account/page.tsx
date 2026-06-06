import { redirect } from "next/navigation";
import { NotificationPreferences } from "@/components/account/notification-preferences";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";

const accountGroups = [
  {
    title: "Account activity",
    intro: "Important updates about your profile, security, and account changes.",
    items: ["Login alerts", "Password changes", "Profile updates"],
  },
  {
    title: "Reservations",
    intro: "Messages about booking requests, confirmations, cancellations, and trip reminders.",
    items: ["Booking requests", "Reservation reminders", "Cancellation updates"],
  },
  {
    title: "Hosting",
    intro: "Account-level updates for your listing setup and host requirements.",
    items: ["Listing status", "Required actions", "Policy updates"],
  },
];

export default async function AccountNotificationSettingsPage() {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <AccountSettingsShell active="Notifications">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Notifications</h2>
      <SettingsTabs tabs={[{ label: "Offers and updates", href: "/account-settings/notifications" }, { label: "Account", href: "/account-settings/notifications/account", active: true }]} />
      <NotificationPreferences groups={accountGroups} storageKey="stayprimeph-account-notifications" defaultOn />
    </AccountSettingsShell>
  );
}
