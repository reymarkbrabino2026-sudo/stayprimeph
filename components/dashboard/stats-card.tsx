export function StatsCard({ description, label, value }: { description?: string; label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 soft-card">
      <p className="text-sm text-black/50">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {description ? <p className="mt-2 text-xs leading-5 text-black/45">{description}</p> : null}
    </div>
  );
}
