import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { adminLinks } from "@/lib/navigation";

const tableHeaders = ["Property", "Guests", "Total", "Status"];

function SkeletonBar({ className = "" }: { className?: string }) {
  return <span className={`block rounded-full bg-black/10 ${className}`} />;
}

export default function LoadingAdminBookings() {
  return (
    <DashboardShell title="Bookings" subtitle="Admin dashboard" links={adminLinks}>
      <div role="status" aria-label="Loading bookings" className="animate-pulse">
        <span className="sr-only">Loading bookings...</span>

        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }).map((_, rowIndex) => (
            <article key={rowIndex} className="rounded-[1.5rem] bg-white p-4 soft-card">
              <div className="space-y-3">
                {tableHeaders.map((header, cellIndex) => (
                  <div key={header} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-black/45">{header}</span>
                    <SkeletonBar className={cellIndex === 0 ? "h-4 w-32" : cellIndex === 3 ? "h-7 w-28" : "h-4 w-16"} />
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
                  {tableHeaders.map((header) => (
                    <th key={header} className="px-4 py-3 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-t">
                    <td className="px-4 py-4">
                      <SkeletonBar className="h-4 w-72 max-w-full" />
                    </td>
                    <td className="px-4 py-4">
                      <SkeletonBar className="h-4 w-10" />
                    </td>
                    <td className="px-4 py-4">
                      <SkeletonBar className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <SkeletonBar className="h-7 w-20" />
                        <SkeletonBar className="h-7 w-16" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
