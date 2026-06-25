import { ImageUploader } from "@/components/forms/image-uploader";
import { createListing, updateListing } from "@/app/host/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";
import { amenityGroups, propertyTypes } from "@/lib/host-wizard-data";
import type { Property } from "@/lib/types";

export function ListingForm({ mode, property, csrfToken }: { mode: "Create" | "Edit"; property?: Property; csrfToken?: string }) {
  const canCreate = mode === "Create";
  const fields: Array<{ label: string; name: string; type: "text" | "number"; defaultValue?: string | number }> = [
    { label: "Title", name: "title", type: "text", defaultValue: property?.title },
    { label: "Address", name: "address", type: "text", defaultValue: property?.address },
    { label: "City", name: "city", type: "text", defaultValue: property?.city },
    { label: "Country", name: "country", type: "text", defaultValue: property?.country },
    { label: "Price per night", name: "pricePerNight", type: "number", defaultValue: property?.pricePerNight },
    { label: "Weekend price", name: "weekendPrice", type: "number", defaultValue: property?.weekendPrice ?? property?.pricePerNight },
    { label: "Cleaning fee", name: "cleaningFee", type: "number", defaultValue: property?.cleaningFee ?? 0 },
    { label: "Security deposit", name: "securityDeposit", type: "number", defaultValue: property?.securityDeposit ?? 0 },
  ];
  const capacityFields: Array<{ label: string; name: string; defaultValue?: number }> = [
    { label: "Bedrooms", name: "bedrooms", defaultValue: property?.bedrooms },
    { label: "Bathrooms", name: "bathrooms", defaultValue: property?.bathrooms },
    { label: "Guests", name: "maxGuests", defaultValue: property?.maxGuests },
  ];

  return (
    <form action={canCreate ? createListing : updateListing} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {csrfToken ? <input type="hidden" name={csrfFieldName} value={csrfToken} /> : null}
      {!canCreate && property ? <input type="hidden" name="id" value={property.id} /> : null}
      <div className="space-y-4 rounded-[1.5rem] bg-white p-5 soft-card">
        {fields.map(({ label, name, type, defaultValue }) => (
          <label key={name} className="block">
            <span className="mb-2 block text-sm font-medium">{label}</span>
            <input name={name} type={type} defaultValue={defaultValue} required className="min-h-12 w-full rounded-2xl border p-3" placeholder={label} />
          </label>
        ))}
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Description</span>
          <textarea name="description" defaultValue={property?.description} required rows={6} maxLength={1000} className="w-full rounded-2xl border p-3 leading-7" placeholder="Describe what makes this stay special." />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Virtual tour URL</span>
          <input
            name="virtualTourUrl"
            type="url"
            defaultValue={property?.virtualTourUrl ?? ""}
            className="min-h-12 w-full rounded-2xl border p-3"
            placeholder="https://my.matterport.com/show/?m=..."
          />
          <span className="mt-2 block text-xs leading-5 text-black/55">Optional Matterport, Kuula, YouTube 360, Vimeo, or CloudPano link.</span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Property type</span>
          <select name="propertyType" defaultValue={property?.propertyType ?? "House"} className="min-h-12 w-full rounded-2xl border p-3">
            {propertyTypes.map((item) => (
              <option key={item.id} value={item.label}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Booking type</span>
          <select name="bookingType" defaultValue={property?.bookingType ?? "stay"} className="min-h-12 w-full rounded-2xl border p-3">
            <option value="stay">Stay bookings only</option>
            <option value="package">Package bookings only</option>
            <option value="both">Stay and package bookings</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Currency</span>
          <select name="currency" defaultValue={property?.currency ?? "PHP"} className="min-h-12 w-full rounded-2xl border p-3">
            {["PHP", "USD"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Holiday price</span>
            <input name="holidayPrice" type="number" min="0" defaultValue={property?.holidayPrice ?? 0} className="min-h-12 w-full rounded-2xl border p-3" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Holiday dates</span>
            <input name="holidayDates" type="text" defaultValue={(property?.holidayDates ?? []).join(", ")} className="min-h-12 w-full rounded-2xl border p-3" placeholder="2026-12-24, 2026-12-31" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {capacityFields.map(({ label, name, defaultValue }) => (
            <label key={name} className="block">
              <span className="mb-2 block text-sm font-medium">{label}</span>
              <input name={name} type="number" min="0" defaultValue={defaultValue} required className="min-h-12 w-full rounded-2xl border p-3" placeholder="0" />
            </label>
          ))}
        </div>
        <button type="submit" className="min-h-12 w-full rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white sm:w-auto">
          {canCreate ? "Create listing" : "Save changes"}
        </button>
      </div>
      <div className="space-y-4">
        <ImageUploader listingId={property?.id} initialPhotos={property?.images} csrfToken={csrfToken} />
        <div className="rounded-[1.5rem] bg-white p-5 soft-card">
          <h3 className="font-semibold">Amenities</h3>
          <div className="mt-4 grid gap-5 text-sm">
            {amenityGroups.map((group) => (
              <fieldset key={group.id}>
                <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-black/45">{group.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <label key={item.id} className="cursor-pointer rounded-full bg-[#fbf7f2] px-3 py-2">
                      <input type="checkbox" name="amenities" value={item.label} defaultChecked={property?.amenities.includes(item.label)} className="mr-2" />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
