export function FilterSidebar() {
  return (
    <aside className="rounded-[1.75rem] bg-white p-5 soft-card">
      <h2 className="text-lg font-bold">Filters</h2>
      {["Price range", "Property type", "Amenities", "Bedrooms", "Bathrooms", "Rating"].map((item) => (
        <div key={item} className="mt-5 border-t pt-5">
          <p className="font-medium">{item}</p>
          <div className="mt-3 h-2 rounded-full bg-[#efe5da]" />
        </div>
      ))}
    </aside>
  );
}
