import { NotificationBell } from "@/components/notifications/notification-bell";

export function DashboardHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-black/45">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-black/60">{description}</p>}
      </div>
      <div className="self-start">
        <NotificationBell variant="panel" />
      </div>
    </header>
  );
}
