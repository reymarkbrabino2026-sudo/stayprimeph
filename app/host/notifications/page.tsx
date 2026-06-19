import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { getCurrentUser } from "@/lib/auth";
import { hostLinks } from "@/lib/navigation";
import { getNotificationsForUser } from "@/lib/notifications";

export default async function HostNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=host&next=/host/notifications");

  const notifications = await getNotificationsForUser(user, 50);

  return (
    <DashboardShell title="Notifications" subtitle="Host dashboard" description="Booking requests, guest messages, payments, and listing activity." links={hostLinks}>
      <NotificationList notifications={notifications} />
    </DashboardShell>
  );
}
