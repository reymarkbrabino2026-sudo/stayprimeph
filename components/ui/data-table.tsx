export function DataTable({
  embedded = false,
  headers,
  rows,
}: {
  embedded?: boolean;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed bg-white p-5 text-center text-sm text-black/55 sm:rounded-[1.5rem] sm:p-6">
        No records to show.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <article key={index} className={embedded ? "min-w-0 rounded-[1.25rem] border border-black/10 bg-[#fbfaf8] p-4" : "min-w-0 rounded-[1.25rem] bg-white p-4 soft-card"}>
            <div className="space-y-3">
              {row.map((cell, cellIndex) => {
                const headerLabel = headers[cellIndex] || "Action";
                return (
                  <div key={cellIndex} className="grid min-w-0 gap-1 border-b border-black/[0.06] pb-3 last:border-b-0 last:pb-0">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{headerLabel}</span>
                    <div className="min-w-0 break-words text-sm font-medium text-black [&_*]:min-w-0">{cell}</div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <div className={embedded ? "hidden overflow-hidden rounded-[1.25rem] border border-black/10 bg-white md:block" : "hidden overflow-hidden rounded-[1.5rem] bg-white soft-card md:block"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-[#fbf7f2] text-black/55">
              <tr>
                {headers.map((header) => (
                  <th key={header} className={`px-4 py-3 font-medium ${header.toLowerCase() === "actions" ? "text-right" : ""}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-black/10 transition hover:bg-[#fbfaf8]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`px-4 py-4 align-top ${headers[cellIndex]?.toLowerCase() === "actions" ? "text-right" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
