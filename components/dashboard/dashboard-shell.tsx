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
  return (
    <div className="min-h-screen bg-[#f8f3ed]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <DashboardSidebar links={links} />
        <main className="px-4 pb-24 pt-5 sm:px-6 sm:pb-24 lg:p-10">
          <DashboardHeader eyebrow={subtitle} title={title} description={description} />
          <div className="mt-6 sm:mt-8">{children}</div>
        </main>
      </div>
      <MobileBottomNav links={links} />
    </div>
  );
}
