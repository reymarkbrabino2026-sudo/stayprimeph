export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed bg-white p-6 text-center sm:p-8">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-black/55">{body}</p>
    </div>
  );
}
