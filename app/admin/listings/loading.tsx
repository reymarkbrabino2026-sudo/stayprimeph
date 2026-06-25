import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { adminLinks } from "@/lib/navigation";

const historyHeaders = ["Listing", "Location", "Type", "Price", "Status"];

function SkeletonBar({ className = "" }: { className?: string }) {
  return <span className={`block rounded-full bg-black/10 ${className}`} />;
}

function StatCardSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 soft-card">
      <p className="text-sm text-black/50">{label}</p>
      <SkeletonBar className="mt-3 h-8 w-10" />
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <article className="rounded-[1.5rem] bg-white p-4 soft-card">
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="sk-block aspect-[4/3] rounded-[1rem]" />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-4 w-56 max-w-full" />
              <SkeletonBar className="mt-3 h-4 w-40 max-w-[80%]" />
            </div>
            <SkeletonBar className="h-7 w-20" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-4 w-16" />
            <SkeletonBar className="h-4 w-20" />
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SkeletonBar className="h-4 w-24" />
              <SkeletonBar className="mt-2 h-3 w-28" />
            </div>
            <div className="flex gap-2">
              <SkeletonBar className="h-7 w-20" />
              <SkeletonBar className="h-7 w-20" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function TableSkeleton({
  headers,
  rows,
}: {
  headers: string[];
  rows: number;
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <article key={rowIndex} className="rounded-[1.5rem] bg-white p-4 soft-card">
            <div className="space-y-3">
              {headers.map((header, cellIndex) => (
                <div key={header} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-black/45">{header}</span>
                  {cellIndex === 0 ? (
                    <SkeletonBar className="h-4 w-40 max-w-[55%]" />
                  ) : cellIndex === 3 ? (
                    <SkeletonBar className="h-7 w-24" />
                  ) : (
                    <SkeletonBar className="h-4 w-20" />
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[1.5rem] bg-white soft-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fbf7f2] text-black/55">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-t">
                  <td className="px-4 py-4">
                    <SkeletonBar className="h-4 w-72 max-w-full" />
                  </td>
                  <td className="px-4 py-4">
                    <SkeletonBar className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-4">
                    <SkeletonBar className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-4">
                    <SkeletonBar className="h-7 w-24" />
                  </td>
                  <td className="px-4 py-4">
                    <SkeletonBar className="h-7 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function LoadingAdminListings() {
  return (
    <DashboardShell title="Listings Approval" subtitle="Admin dashboard" description="Approve new host listings before they become visible to guests." links={adminLinks}>
      <div role="status" aria-label="Loading listing approvals" className="animate-pulse">
        <span className="sr-only">Loading listing approvals...</span>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {["Pending", "Approved", "Rejected"].map((label) => (
            <StatCardSkeleton key={label} label={label} />
          ))}
        </div>

        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Needs review</h2>
            <SkeletonBar className="mt-2 h-4 w-80 max-w-full" />
          </div>
          <SkeletonBar className="h-4 w-20" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>

        <h2 className="mb-3 mt-8 text-xl font-bold">Review history</h2>
        <TableSkeleton headers={historyHeaders} rows={3} />
      </div>
    </DashboardShell>
  );
}
