import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { guestLinks } from "@/lib/navigation";

function SkeletonBar({ className = "" }: { className?: string }) {
  return <span className={`block rounded-full bg-black/10 ${className}`} />;
}

export default function LoadingGuestDashboard() {
  return (
    <DashboardShell
      title="Loading"
      subtitle="Guest dashboard"
      description="Preparing your dashboard."
      links={guestLinks}
    >
      <div role="status" aria-label="Loading dashboard section" className="animate-pulse">
        <span className="sr-only">Loading dashboard section...</span>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-white p-5 soft-card">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="mt-4 h-8 w-16" />
          </div>
          <div className="rounded-[1.5rem] bg-white p-5 soft-card">
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="mt-4 h-8 w-12" />
          </div>
          <div className="rounded-[1.5rem] bg-white p-5 soft-card">
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="mt-4 h-8 w-14" />
          </div>
        </div>
        <div className="mt-6 rounded-[1.5rem] bg-white p-5 soft-card">
          <SkeletonBar className="h-5 w-40" />
          <SkeletonBar className="mt-5 h-4 w-full max-w-2xl" />
          <SkeletonBar className="mt-3 h-4 w-2/3 max-w-xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonBar className="h-20 rounded-2xl" />
            <SkeletonBar className="h-20 rounded-2xl" />
            <SkeletonBar className="h-20 rounded-2xl" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
