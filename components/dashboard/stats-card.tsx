export function StatsCard({ description, label, value }: { description?: string; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.25rem] bg-white p-4 soft-card sm:rounded-[1.5rem] sm:p-5">
      <p className="break-words text-sm text-black/50">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl">{value}</p>
      {description ? <p className="mt-2 text-xs leading-5 text-black/45">{description}</p> : null}
    </div>
  );
}
