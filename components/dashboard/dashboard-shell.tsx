import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardShell({
  title,
  subtitle,
  description,
  links,
  children,
}: {
  title: string;
  subtitle: string;
  description?: string;
  links: { label: string; href: string }[];
  children: React.ReactNode;
}) {
  const showHomeLogo = links.some((link) => link.href.startsWith("/guest") || link.href.startsWith("/host"));

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#f8f3ed]">
      <div className="grid min-h-screen min-w-0 max-w-full lg:grid-cols-[260px_minmax(0,1fr)]">
        <DashboardSidebar links={links} />
        <main className="min-w-0 max-w-full overflow-x-hidden px-4 pb-24 pt-5 sm:px-6 sm:pb-24 lg:p-10">
          <DashboardHeader eyebrow={subtitle} title={title} description={description} showHomeLogo={showHomeLogo} />
          <div className="mt-6 min-w-0 max-w-full sm:mt-8">{children}</div>
        </main>
      </div>
      <MobileBottomNav links={links} />
    </div>
  );
}
