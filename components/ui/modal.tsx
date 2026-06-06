export function Modal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-lg rounded-[1.5rem] border bg-white p-5 soft-card">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 text-sm text-black/65">{children}</div>
    </div>
  );
}
