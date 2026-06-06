import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { guestLinks } from "@/lib/navigation";

export default function GuestConnectionsPage() {
  return (
    <DashboardShell title="Connections" subtitle="Guest dashboard" description="People connected through trips and experiences." links={guestLinks}>
      <EmptyState
        title="No connections yet"
        body="When you invite someone on a trip or join an experience, traveler profiles connected to you will appear here."
      />
      <Link href="/search" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">
        Book a trip
      </Link>
    </DashboardShell>
  );
}
