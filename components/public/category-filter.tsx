export function CategoryFilter({ categories }: { categories: string[] }) {
  return (
    <section className="mt-8 flex flex-wrap gap-3">
      {categories.map((category) => (
        <span key={category} className="rounded-full border bg-white px-4 py-2 text-sm">
          {category}
        </span>
      ))}
    </section>
  );
}
