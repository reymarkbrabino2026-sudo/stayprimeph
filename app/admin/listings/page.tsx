import { approveListing, rejectListing } from "@/app/admin/listings/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";

export default async function AdminListingsPage() {
  const properties = await getProperties();
  const pending = properties.filter((property) => property.status === "pending");
  const reviewed = properties.filter((property) => property.status !== "pending");

  return (
    <DashboardShell title="Listings Approval" subtitle="Admin dashboard" description="Approve new host listings before they become visible to guests." links={adminLinks}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Pending", pending.length],
          ["Approved", properties.filter((property) => property.status === "approved").length],
          ["Rejected", properties.filter((property) => property.status === "rejected").length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.5rem] bg-white p-5 soft-card">
            <p className="text-sm text-black/50">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold">Needs review</h2>
      <DataTable
        headers={["Listing", "City", "Type", "Status", "Actions"]}
        rows={pending.map((property) => [
          property.title,
          property.city,
          property.propertyType,
          <StatusBadge key={`${property.id}-status`} status={property.status} />,
          <div key={`${property.id}-actions`} className="flex gap-2">
            <form action={approveListing}>
              <input type="hidden" name="id" value={property.id} />
              <button className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Approve</button>
            </form>
            <form action={rejectListing}>
              <input type="hidden" name="id" value={property.id} />
              <button className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Reject</button>
            </form>
          </div>,
        ])}
      />

      <h2 className="mb-3 mt-8 text-xl font-bold">Review history</h2>
      <DataTable
        headers={["Listing", "City", "Type", "Status"]}
        rows={reviewed.map((property) => [
          property.title,
          property.city,
          property.propertyType,
          <StatusBadge key={`${property.id}-reviewed-status`} status={property.status} />,
        ])}
      />
    </DashboardShell>
  );
}
