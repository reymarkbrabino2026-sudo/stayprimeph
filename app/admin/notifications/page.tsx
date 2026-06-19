import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { getCurrentUser } from "@/lib/auth";
import { adminLinks } from "@/lib/navigation";
import { getNotificationsForUser } from "@/lib/notifications";

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login?next=/admin/notifications");

  const notifications = await getNotificationsForUser(user, 50);

  return (
    <DashboardShell title="Notifications" subtitle="Admin dashboard" description="Listings, payments, support messages, and platform activity." links={adminLinks}>
      <NotificationList notifications={notifications} />
    </DashboardShell>
  );
}
