import { ImageUploader } from "@/components/forms/image-uploader";
import { createListing } from "@/app/host/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";

export function ListingForm({ mode, csrfToken }: { mode: "Create" | "Edit"; csrfToken?: string }) {
  const canCreate = mode === "Create";

  return (
    <form action={canCreate ? createListing : undefined} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {canCreate && csrfToken ? <input type="hidden" name={csrfFieldName} value={csrfToken} /> : null}
      <div className="space-y-4 rounded-[1.5rem] bg-white p-5 soft-card">
        {[
          ["Title", "title", "text"],
          ["Description", "description", "text"],
          ["Address", "address", "text"],
          ["City", "city", "text"],
          ["Country", "country", "text"],
          ["Price per night", "pricePerNight", "number"],
          ["Weekend price", "weekendPrice", "number"],
        ].map(([label, name, type]) => (
          <label key={name} className="block">
            <span className="mb-2 block text-sm font-medium">{label}</span>
            <input name={name} type={type} required className="min-h-12 w-full rounded-2xl border p-3" placeholder={label} />
          </label>
        ))}
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Property type</span>
          <select name="propertyType" defaultValue="House" className="min-h-12 w-full rounded-2xl border p-3">
            {["House", "Apartment", "Villa", "Cabin", "Condo"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Bedrooms", "bedrooms"],
            ["Bathrooms", "bathrooms"],
            ["Guests", "maxGuests"],
          ].map(([label, name]) => (
            <label key={name} className="block">
              <span className="mb-2 block text-sm font-medium">{label}</span>
              <input name={name} type="number" min="0" required className="min-h-12 w-full rounded-2xl border p-3" placeholder="0" />
            </label>
          ))}
        </div>
        <button type="submit" className="min-h-12 w-full rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white sm:w-auto">
          {mode} listing
        </button>
      </div>
      <div className="space-y-4">
        <ImageUploader />
        <div className="rounded-[1.5rem] bg-white p-5 soft-card">
          <h3 className="font-semibold">Amenities</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {["Wi-Fi", "Pool", "Kitchen", "Parking", "Workspace"].map((item) => (
              <label key={item} className="cursor-pointer rounded-full bg-[#fbf7f2] px-3 py-2">
                <input type="checkbox" name="amenities" value={item} className="mr-2" />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
