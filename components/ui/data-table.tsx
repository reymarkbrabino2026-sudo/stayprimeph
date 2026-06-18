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
      <div className="rounded-[1.5rem] border border-dashed bg-white p-6 text-center text-sm text-black/55">
        No records to show.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <article key={index} className={embedded ? "rounded-[1.25rem] border border-black/10 bg-[#fbfaf8] p-4" : "rounded-[1.5rem] bg-white p-4 soft-card"}>
            <div className="space-y-3">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-black/45">{headers[cellIndex]}</span>
                  <span className="text-right">{cell}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className={embedded ? "hidden overflow-hidden rounded-[1.25rem] border border-black/10 md:block" : "hidden overflow-hidden rounded-[1.5rem] bg-white soft-card md:block"}>
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
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
              <tr key={index} className="border-t">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-4 py-4 ${headers[cellIndex]?.toLowerCase() === "actions" ? "text-right" : ""}`}>
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
