import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { guestLinks } from "@/lib/navigation";

export default async function GuestProfilePage() {
  const guest = await getCurrentUser();

  return (
    <DashboardShell title="Profile Settings" subtitle="Guest dashboard" description="Review the traveler identity used for bookings." links={guestLinks}>
      <div className="max-w-2xl rounded-[1.5rem] bg-white p-5 soft-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileField label="Name" value={guest?.name ?? "Guest"} />
          <ProfileField label="Email" value={guest?.email ?? "Not available"} />
          <ProfileField label="Phone" value={guest?.phone || "Not provided"} />
          <ProfileField label="Role" value={guest?.role ?? "guest"} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/account-settings" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white">
            Open account settings
          </Link>
          <LogoutButton />
        </div>
      </div>
    </DashboardShell>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fbf7f2] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/40">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
