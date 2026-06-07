import { redirect } from "next/navigation";
import { NotificationPreferences } from "@/components/account/notification-preferences";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";

const groups = [
  { title: "Hosting insights and rewards", intro: "Learn about best hosting practices, and get access to exclusive hosting perks.", items: ["Recognition and achievements", "Insights and tips", "Pricing trends and suggestions", "Hosting perks"] },
  { title: "Hosting updates", intro: "Get updates about programs, features, and regulations.", items: ["News and updates", "Local laws and regulations"] },
  { title: "Travel tips and offers", intro: "Inspire your next trip with personalized recommendations and special offers.", items: ["Inspiration and offers", "Trip planning"] },
  { title: "StayPrimePH updates", intro: "Stay up to date on the latest news from StayPrimePH, and let us know how we can improve.", items: ["News and programs", "Feedback", "Travel regulations"] },
];

export default async function AccountNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const accountSettings = await getAccountSettings(user);
  return (
    <AccountSettingsShell active="Notifications">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Notifications</h2>
      <SettingsTabs tabs={[{ label: "Offers and updates", href: "/account-settings/notifications", active: true }, { label: "Account", href: "/account-settings/notifications/account" }]} />
      <NotificationPreferences groups={groups} scope="offers" initialState={accountSettings.notifications.offers} showMarketingUnsubscribe />
    </AccountSettingsShell>
  );
}
