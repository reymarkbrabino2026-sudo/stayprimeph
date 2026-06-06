export function DashboardHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header>
      <p className="text-sm uppercase tracking-[0.24em] text-black/45">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 text-black/60">{description}</p>}
    </header>
  );
}
