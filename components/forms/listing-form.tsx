import { ImageUploader } from "@/components/forms/image-uploader";
import { createListing, updateListing } from "@/app/host/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";
import { amenityGroups, propertyTypes } from "@/lib/host-wizard-data";
import type { Property } from "@/lib/types";

function normalizeAmenityName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const presetAmenityNames = new Set(
  amenityGroups.flatMap((group) => group.items.map((item) => normalizeAmenityName(item.label))),
);

export function ListingForm({ mode, property, csrfToken, formId }: { mode: "Create" | "Edit"; property?: Property; csrfToken?: string; formId?: string }) {
  const canCreate = mode === "Create";
  const propertyAmenities = property?.amenities ?? [];
  const propertyRules = property?.rules ?? [];
  const selectedAmenityNames = new Set(propertyAmenities.map(normalizeAmenityName));
  const customAmenities = propertyAmenities.filter((amenity) => !presetAmenityNames.has(normalizeAmenityName(amenity)));
  const fields: Array<{ label: string; name: string; type: "text" | "number"; defaultValue?: string | number; step?: number }> = [
    { label: "Title", name: "title", type: "text", defaultValue: property?.title },
    { label: "Address", name: "address", type: "text", defaultValue: property?.address },
    { label: "City", name: "city", type: "text", defaultValue: property?.city },
    { label: "Country", name: "country", type: "text", defaultValue: property?.country },
    { label: "Price per night", name: "pricePerNight", type: "number", defaultValue: property?.pricePerNight, step: 0.01 },
    { label: "Weekend price", name: "weekendPrice", type: "number", defaultValue: property?.weekendPrice ?? property?.pricePerNight, step: 0.01 },
    { label: "Cleaning fee", name: "cleaningFee", type: "number", defaultValue: property?.cleaningFee ?? 0, step: 0.01 },
    { label: "Security deposit", name: "securityDeposit", type: "number", defaultValue: property?.securityDeposit ?? 0, step: 0.01 },
  ];
  const capacityFields: Array<{ label: string; name: string; defaultValue?: number }> = [
    { label: "Bedrooms", name: "bedrooms", defaultValue: property?.bedrooms },
    { label: "Bathrooms", name: "bathrooms", defaultValue: property?.bathrooms },
    { label: "Guests", name: "maxGuests", defaultValue: property?.maxGuests },
  ];

  return (
    <form id={formId} action={canCreate ? createListing : updateListing} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {csrfToken ? <input type="hidden" name={csrfFieldName} value={csrfToken} /> : null}
      {!canCreate && property ? <input type="hidden" name="id" value={property.id} /> : null}
      <div className="space-y-4 rounded-[1.5rem] bg-white p-5 soft-card">
        {fields.map(({ label, name, type, defaultValue, step }) => (
          <label key={name} className="block">
            <span className="mb-2 block text-sm font-medium">{label}</span>
            <input name={name} type={type} step={type === "number" ? step : undefined} defaultValue={defaultValue} required className="min-h-12 w-full rounded-2xl border p-3" placeholder={label} />
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
          <span className="mb-2 block text-sm font-medium">Listing video link</span>
          <textarea
            name="listingVideoUrl"
            defaultValue={property?.listingVideoUrl ?? ""}
            rows={3}
            maxLength={4096}
            className="w-full rounded-2xl border p-3 leading-6"
            placeholder="Paste a YouTube or Vimeo URL, or an iframe embed link"
          />
          <span className="mt-2 block text-xs leading-5 text-black/55">Optional. This video appears on the listing page before the gallery.</span>
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
            <input name="holidayPrice" type="number" min="0" step="0.01" defaultValue={property?.holidayPrice ?? 0} className="min-h-12 w-full rounded-2xl border p-3" />
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
                      <input type="checkbox" name="amenities" value={item.label} defaultChecked={selectedAmenityNames.has(normalizeAmenityName(item.label))} className="mr-2" />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/45">Custom amenities</span>
              <textarea
                name="customAmenities"
                defaultValue={customAmenities.join("\n")}
                rows={4}
                maxLength={2000}
                className="w-full rounded-2xl border p-3 leading-6"
                placeholder="One amenity per line"
              />
            </label>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 soft-card">
          <h3 className="font-semibold">Rules</h3>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/45">House rules</span>
            <textarea
              name="rules"
              defaultValue={propertyRules.join("\n")}
              rows={6}
              maxLength={3000}
              className="w-full rounded-2xl border p-3 leading-6"
              placeholder="One rule per line"
            />
          </label>
        </div>
      </div>
    </form>
  );
}
