import Link from "next/link";
import { Bell, Clock3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityNotification } from "@/lib/notifications";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function categoryLabel(category: ActivityNotification["category"]) {
  if (category === "booking") return "Booking";
  if (category === "message") return "Message";
  if (category === "payment") return "Payment";
  if (category === "listing") return "Listing";
  if (category === "support") return "Support";
  if (category === "security") return "Security";
  return "Activity";
}

export function NotificationList({ notifications }: { notifications: ActivityNotification[] }) {
  if (notifications.length === 0) {
    return <EmptyState title="No notifications yet" body="Booking, payment, message, and listing activity will appear here." />;
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <article key={notification.id} className="rounded-[1.5rem] bg-white p-5 soft-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e8f4ef] text-[#083f35]">
                <Bell size={19} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-black/55">
                    {categoryLabel(notification.category)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-black/40">
                    <Clock3 size={13} />
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold">{notification.title}</h2>
                <p className="mt-2 text-sm leading-6 text-black/60">{notification.body}</p>
              </div>
            </div>
            <Link href={notification.href} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28]">
              Open
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
