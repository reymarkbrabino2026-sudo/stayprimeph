import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { guestLinks } from "@/lib/navigation";

function SkeletonBar({ className = "" }: { className?: string }) {
  return <span className={`block rounded-full bg-black/10 ${className}`} />;
}

export default function LoadingGuestMessages() {
  return (
    <DashboardShell
      title="Messages"
      subtitle="Guest dashboard"
      description="Conversations with hosts about your stays."
      links={guestLinks}
    >
      <div role="status" aria-label="Loading messages" className="animate-pulse">
        <span className="sr-only">Loading messages...</span>
        <div className="rounded-[1.5rem] border border-dashed bg-white px-6 py-10 text-center sm:px-8 sm:py-9">
          <div className="mx-auto max-w-md space-y-3">
            <SkeletonBar className="mx-auto h-4 w-40" />
            <SkeletonBar className="mx-auto h-4 w-full max-w-sm" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
