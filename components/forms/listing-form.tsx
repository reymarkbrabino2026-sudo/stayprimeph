"use client";

import type { FormEvent } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, X } from "lucide-react";
import { ImageUploader } from "@/components/forms/image-uploader";
import { createListing, updateListingWithFeedback, type ListingFormState } from "@/app/host/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";
import { amenityGroups, propertyTypes } from "@/lib/host-wizard-data";
import type { ListingBookingType, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

type ActiveListingFeedback = ListingFormState & { status: "success" | "error" };

const initialListingFormState: ListingFormState = { status: "idle", fieldErrors: {} };

const clientFieldLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  virtualTourUrl: "Virtual tour URL",
  listingVideoUrl: "Listing video link",
  address: "Address",
  city: "City",
  country: "Country",
  propertyType: "Property type",
  pricePerNight: "Price per night",
  weekendPrice: "Weekend price",
  cleaningFee: "Cleaning fee",
  securityDeposit: "Security deposit",
  currency: "Currency",
  bookingType: "Booking type",
  holidayPrice: "Holiday price",
  holidayDates: "Holiday dates",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  maxGuests: "Guests",
  bookingPackageName: "Package name",
  bookingPackageAccessType: "Guest access",
  bookingPackageWeekdayRate: "Weekday rate",
  bookingPackageWeekendRate: "Weekend rate",
  bookingPackageMaxGuests: "Package guests",
  bookingPackageSleepingCapacity: "Package sleeps",
  bookingPackageDurationHours: "Package hours",
  bookingPackageUnit: "Package unit",
  photoUrls: "Photos",
};

function normalizeAmenityName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const presetAmenityNames = new Set(
  amenityGroups.flatMap((group) => group.items.map((item) => normalizeAmenityName(item.label))),
);

export function ListingForm({
  mode,
  property,
  csrfToken,
  formId,
  initialSaved = false,
}: {
  mode: "Create" | "Edit";
  property?: Property;
  csrfToken?: string;
  formId?: string;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const canCreate = mode === "Create";
  const resolvedFormId = formId ?? (canCreate ? "listing-create-form" : `listing-edit-${property?.id ?? "form"}`);
  const [state, updateAction] = useActionState(updateListingWithFeedback, initialListingFormState);
  const [clientFeedback, setClientFeedback] = useState<ListingFormState>(initialListingFormState);
  const [dismissedFeedbackAt, setDismissedFeedbackAt] = useState<number | undefined>();
  const [clearedFieldNames, setClearedFieldNames] = useState<Set<string>>(() => new Set());
  const [selectedBookingType, setSelectedBookingType] = useState<ListingBookingType>(property?.bookingType ?? "stay");
  const propertyAmenities = property?.amenities ?? [];
  const propertyRules = property?.rules ?? [];
  const selectedAmenityNames = new Set(propertyAmenities.map(normalizeAmenityName));
  const customAmenities = propertyAmenities.filter((amenity) => !presetAmenityNames.has(normalizeAmenityName(amenity)));
  const formAction = canCreate ? createListing : updateAction;
  const serverFeedback = state.status === "success" || state.status === "error" ? state as ActiveListingFeedback : null;
  const localFeedback = clientFeedback.status === "error" ? clientFeedback as ActiveListingFeedback : null;
  const initialFeedback = useMemo<ActiveListingFeedback | null>(() => initialSaved ? {
    status: "success",
    message: "Listing updated successfully.",
    fieldErrors: {},
    updatedAt: 0,
  } : null, [initialSaved]);
  const activeFeedback = localFeedback ?? serverFeedback ?? initialFeedback;
  const feedbackKey = activeFeedback?.updatedAt;
  const rawFieldErrors = useMemo(
    () => activeFeedback?.status === "error" ? activeFeedback.fieldErrors ?? {} : {},
    [activeFeedback],
  );
  const fieldErrors = useMemo(
    () => Object.fromEntries(Object.entries(rawFieldErrors).filter(([name]) => !clearedFieldNames.has(name))),
    [clearedFieldNames, rawFieldErrors],
  );
  const showFeedback = Boolean(activeFeedback && feedbackKey !== dismissedFeedbackAt);
  const showSimplePricingFields = selectedBookingType !== "package";
  const hiddenSimplePricingValues = showSimplePricingFields ? [] : [
    ["pricePerNight", property?.pricePerNight ?? 1],
    ["weekendPrice", property?.weekendPrice ?? property?.pricePerNight ?? 0],
    ["holidayPrice", property?.holidayPrice ?? 0],
    ["holidayDates", (property?.holidayDates ?? []).join(", ")],
  ] as const;
  const fields: Array<{ label: string; name: string; type: "text" | "number"; defaultValue?: string | number; step?: number }> = [
    { label: "Title", name: "title", type: "text", defaultValue: property?.title },
    { label: "Address", name: "address", type: "text", defaultValue: property?.address },
    { label: "City", name: "city", type: "text", defaultValue: property?.city },
    { label: "Country", name: "country", type: "text", defaultValue: property?.country },
    ...(showSimplePricingFields ? [
      { label: "Price per night", name: "pricePerNight", type: "number" as const, defaultValue: property?.pricePerNight, step: 0.01 },
      { label: "Weekend price", name: "weekendPrice", type: "number" as const, defaultValue: property?.weekendPrice ?? property?.pricePerNight, step: 0.01 },
    ] : []),
    { label: "Cleaning fee", name: "cleaningFee", type: "number", defaultValue: property?.cleaningFee ?? 0, step: 0.01 },
    { label: "Security deposit", name: "securityDeposit", type: "number", defaultValue: property?.securityDeposit ?? 0, step: 0.01 },
  ];
  const capacityFields: Array<{ label: string; name: string; defaultValue?: number }> = [
    { label: "Bedrooms", name: "bedrooms", defaultValue: property?.bedrooms },
    { label: "Bathrooms", name: "bathrooms", defaultValue: property?.bathrooms },
    { label: "Guests", name: "maxGuests", defaultValue: property?.maxGuests },
  ];

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status, state.updatedAt]);

  useEffect(() => {
    applyListingErrorHighlights(resolvedFormId, fieldErrors);
    return clearListingErrorHighlights;
  }, [fieldErrors, resolvedFormId]);

  useEffect(() => {
    if (activeFeedback?.status === "error") focusFirstListingError(resolvedFormId, fieldErrors);
  }, [activeFeedback?.status, activeFeedback?.updatedAt, fieldErrors, resolvedFormId]);

  function fieldError(name: string) {
    return fieldErrors[name];
  }

  function fieldErrorId(name: string) {
    return `${resolvedFormId}-${name.replace(/[^a-z0-9]+/gi, "-")}-error`;
  }

  function controlClass(name: string, baseClass: string) {
    return cn(
      baseClass,
      fieldError(name)
        ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100 focus:border-rose-600"
        : "border-black/10",
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = collectClientValidationErrors(event.currentTarget);
    setClearedFieldNames(new Set());

    if (Object.keys(errors).length) {
      event.preventDefault();
      setClientFeedback({
        status: "error",
        message: "Please fix the highlighted fields before saving.",
        fieldErrors: errors,
        updatedAt: Date.now(),
      });
      setDismissedFeedbackAt(undefined);
      return;
    }

    setClientFeedback(initialListingFormState);
    setDismissedFeedbackAt(feedbackKey);
  }

  function handleInputCapture(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (!isNamedFormControl(target) || !rawFieldErrors[target.name]) return;
    setClearedFieldNames((current) => new Set(current).add(target.name));
  }

  function amenityGroupSelectedCount(group: (typeof amenityGroups)[number]) {
    return group.items.filter((item) => selectedAmenityNames.has(normalizeAmenityName(item.label))).length;
  }

  return (
    <>
      {showFeedback && activeFeedback ? (
        <ListingFeedbackPopup feedback={activeFeedback} onDismiss={() => setDismissedFeedbackAt(feedbackKey)} />
      ) : null}

      <form
        id={resolvedFormId}
        action={formAction}
        noValidate
        onSubmit={handleSubmit}
        onInputCapture={handleInputCapture}
        className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] 2xl:items-start"
      >
        {csrfToken ? <input type="hidden" name={csrfFieldName} value={csrfToken} /> : null}
        {!canCreate && property ? <input type="hidden" name="id" value={property.id} /> : null}
        {hiddenSimplePricingValues.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="space-y-4 rounded-[1.5rem] bg-white p-5 soft-card">
          {fields.map(({ label, name, type, defaultValue, step }) => {
            const error = fieldError(name);
            const errorId = fieldErrorId(name);

            return (
              <label key={name} className="block">
                <span className="mb-2 block text-sm font-medium">{label}</span>
                <input
                  name={name}
                  type={type}
                  step={type === "number" ? step : undefined}
                  defaultValue={defaultValue}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  className={controlClass(name, "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
                  placeholder={label}
                />
                <FieldError id={errorId} message={error} />
              </label>
            );
          })}
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Description</span>
            <textarea
              name="description"
              defaultValue={property?.description}
              required
              rows={6}
              maxLength={1000}
              aria-invalid={Boolean(fieldError("description"))}
              aria-describedby={fieldError("description") ? fieldErrorId("description") : undefined}
              className={controlClass("description", "w-full rounded-2xl border p-3 leading-7 outline-none transition focus:border-black")}
              placeholder="Describe what makes this stay special."
            />
            <FieldError id={fieldErrorId("description")} message={fieldError("description")} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Virtual tour URL</span>
            <input
              name="virtualTourUrl"
              type="url"
              defaultValue={property?.virtualTourUrl ?? ""}
              aria-invalid={Boolean(fieldError("virtualTourUrl"))}
              aria-describedby={fieldError("virtualTourUrl") ? fieldErrorId("virtualTourUrl") : undefined}
              className={controlClass("virtualTourUrl", "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
              placeholder="https://my.matterport.com/show/?m=..."
            />
            <span className="mt-2 block text-xs leading-5 text-black/55">Optional Matterport, Kuula, YouTube 360, Vimeo, or CloudPano link.</span>
            <FieldError id={fieldErrorId("virtualTourUrl")} message={fieldError("virtualTourUrl")} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Listing video link</span>
            <textarea
              name="listingVideoUrl"
              defaultValue={property?.listingVideoUrl ?? ""}
              rows={3}
              maxLength={4096}
              aria-invalid={Boolean(fieldError("listingVideoUrl"))}
              aria-describedby={fieldError("listingVideoUrl") ? fieldErrorId("listingVideoUrl") : undefined}
              className={controlClass("listingVideoUrl", "w-full rounded-2xl border p-3 leading-6 outline-none transition focus:border-black")}
              placeholder="Paste a YouTube or Vimeo URL, or an iframe embed link"
            />
            <span className="mt-2 block text-xs leading-5 text-black/55">Optional. This video appears on the listing page before the gallery.</span>
            <FieldError id={fieldErrorId("listingVideoUrl")} message={fieldError("listingVideoUrl")} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Property type</span>
            <select
              name="propertyType"
              defaultValue={property?.propertyType ?? "House"}
              aria-invalid={Boolean(fieldError("propertyType"))}
              aria-describedby={fieldError("propertyType") ? fieldErrorId("propertyType") : undefined}
              className={controlClass("propertyType", "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
            >
              {propertyTypes.map((item) => (
                <option key={item.id} value={item.label}>{item.label}</option>
              ))}
            </select>
            <FieldError id={fieldErrorId("propertyType")} message={fieldError("propertyType")} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Booking type</span>
            <select
              name="bookingType"
              defaultValue={property?.bookingType ?? "stay"}
              onChange={(event) => setSelectedBookingType(event.currentTarget.value as ListingBookingType)}
              aria-invalid={Boolean(fieldError("bookingType"))}
              aria-describedby={fieldError("bookingType") ? fieldErrorId("bookingType") : undefined}
              className={controlClass("bookingType", "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
            >
              <option value="stay">Stay bookings only</option>
              <option value="package">Package bookings only</option>
              <option value="both">Stay and package bookings</option>
            </select>
            <FieldError id={fieldErrorId("bookingType")} message={fieldError("bookingType")} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Currency</span>
            <select
              name="currency"
              defaultValue={property?.currency ?? "PHP"}
              aria-invalid={Boolean(fieldError("currency"))}
              aria-describedby={fieldError("currency") ? fieldErrorId("currency") : undefined}
              className={controlClass("currency", "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
            >
              {["PHP", "USD"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <FieldError id={fieldErrorId("currency")} message={fieldError("currency")} />
          </label>
          {showSimplePricingFields ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Holiday price</span>
                <input
                  name="holidayPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={property?.holidayPrice ?? 0}
                  aria-invalid={Boolean(fieldError("holidayPrice"))}
                  aria-describedby={fieldError("holidayPrice") ? fieldErrorId("holidayPrice") : undefined}
                  className={controlClass("holidayPrice", "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
                />
                <FieldError id={fieldErrorId("holidayPrice")} message={fieldError("holidayPrice")} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Holiday dates</span>
                <input
                  name="holidayDates"
                  type="text"
                  defaultValue={(property?.holidayDates ?? []).join(", ")}
                  aria-invalid={Boolean(fieldError("holidayDates"))}
                  aria-describedby={fieldError("holidayDates") ? fieldErrorId("holidayDates") : undefined}
                  className={controlClass("holidayDates", "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
                  placeholder="2026-12-24, 2026-12-31"
                />
                <FieldError id={fieldErrorId("holidayDates")} message={fieldError("holidayDates")} />
              </label>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            {capacityFields.map(({ label, name, defaultValue }) => {
              const error = fieldError(name);
              const errorId = fieldErrorId(name);

              return (
                <label key={name} className="block">
                  <span className="mb-2 block text-sm font-medium">{label}</span>
                  <input
                    name={name}
                    type="number"
                    min="0"
                    defaultValue={defaultValue}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className={controlClass(name, "min-h-12 w-full rounded-2xl border p-3 outline-none transition focus:border-black")}
                    placeholder="0"
                  />
                  <FieldError id={errorId} message={error} />
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-4 2xl:sticky 2xl:top-6">
          <ImageUploader listingId={property?.id} initialPhotos={property?.images} csrfToken={csrfToken} />
          <FieldError id={fieldErrorId("photoUrls")} message={fieldError("photoUrls")} />
          <div className="rounded-[1.35rem] border border-black/10 bg-white p-4 shadow-[0_14px_45px_rgba(53,31,8,0.07)] sm:p-5">
            <h3 className="text-lg font-bold text-[#21170f]">Amenities</h3>
            <div className="mt-4 grid gap-5 text-sm">
              {amenityGroups.map((group) => (
                <details key={group.id} className="group rounded-2xl border border-black/10 bg-[#fbf7f2] p-2">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-white px-3 text-sm font-bold text-[#21170f] outline-none transition hover:bg-white/80 focus-visible:ring-4 focus-visible:ring-[#083f35]/10 [&::-webkit-details-marker]:hidden">
                    <span>{group.title}</span>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-black/45">
                      {amenityGroupSelectedCount(group)} selected
                      <ChevronDown size={15} className="transition group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <fieldset className="mt-3 px-1 pb-1">
                    <legend className="sr-only">{group.title}</legend>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <label key={item.id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 font-semibold text-black/70 transition hover:border-[#083f35]/35">
                          <input type="checkbox" name="amenities" value={item.label} defaultChecked={selectedAmenityNames.has(normalizeAmenityName(item.label))} className="size-4 accent-[#083f35]" />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </details>
              ))}
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/45">Custom amenities</span>
                <textarea
                  name="customAmenities"
                  defaultValue={customAmenities.join("\n")}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-2xl border border-black/10 p-3 leading-6 outline-none transition focus:border-black"
                  placeholder="One amenity per line"
                />
              </label>
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-black/10 bg-white p-4 shadow-[0_14px_45px_rgba(53,31,8,0.07)] sm:p-5">
            <h3 className="text-lg font-bold text-[#21170f]">Rules</h3>
            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/45">House rules</span>
              <textarea
                name="rules"
                defaultValue={propertyRules.join("\n")}
                rows={6}
                maxLength={3000}
                className="w-full rounded-2xl border border-black/10 p-3 leading-6 outline-none transition focus:border-black"
                placeholder="One rule per line"
              />
            </label>
          </div>
        </div>
        <div className="sticky bottom-4 z-20 rounded-[1.25rem] border border-black/10 bg-white/95 p-3 shadow-[0_20px_60px_rgba(33,23,15,0.14)] backdrop-blur 2xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#21170f]">{canCreate ? "Create listing" : "Save listing updates"}</p>
              <p className="mt-1 text-sm text-black/55">Photos, amenities, rules, pricing, and booking settings will be saved together.</p>
            </div>
            <SubmitButton canCreate={canCreate} />
          </div>
        </div>
      </form>
    </>
  );
}

function SubmitButton({ canCreate }: { canCreate: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white transition hover:bg-[#352518] disabled:cursor-wait disabled:bg-black/45 sm:w-auto"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Saving..." : canCreate ? "Create listing" : "Save changes"}
    </button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-2 text-sm font-medium text-rose-700">{message}</p>;
}

function ListingFeedbackPopup({
  feedback,
  onDismiss,
}: {
  feedback: ActiveListingFeedback;
  onDismiss: () => void;
}) {
  const success = feedback.status === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      className={cn(
        "fixed bottom-5 right-5 z-50 flex w-[min(calc(100vw-2rem),24rem)] items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl",
        success ? "border-emerald-200 text-emerald-900" : "border-rose-200 text-rose-900",
      )}
    >
      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", success ? "bg-emerald-50" : "bg-rose-50")}>
        {success ? <CheckCircle2 className="size-5 text-emerald-700" aria-hidden="true" /> : <AlertCircle className="size-5 text-rose-700" aria-hidden="true" />}
      </span>
      <p className="min-w-0 flex-1 text-sm font-semibold leading-6">
        {feedback.message ?? (success ? "Listing updated successfully." : "We couldn't save your changes.")}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-grid size-8 shrink-0 place-items-center rounded-full border border-black/10 text-black/55 transition hover:text-black"
        aria-label="Dismiss message"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function isNamedFormControl(target: EventTarget | null): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return false;
  return Boolean(target.name);
}

function isValidatableFormControl(element: Element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) return false;
  if (!element.name || element.disabled) return false;
  return !(element instanceof HTMLInputElement && element.type === "hidden");
}

function collectClientValidationErrors(form: HTMLFormElement) {
  const errors: Record<string, string> = {};
  const controls = Array.from(form.elements).filter((element): element is Element => element instanceof Element).filter(isValidatableFormControl);

  for (const control of controls) {
    if (control.checkValidity()) continue;
    const label = clientFieldLabels[control.name] ?? "This field";
    errors[control.name] ??= `${label}: ${control.validationMessage || "Please check this field."}`;
  }

  return errors;
}

function formControls(formId: string) {
  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) return [];
  return Array.from(form.elements).filter((element): element is Element => element instanceof Element).filter(isValidatableFormControl);
}

function clearListingErrorHighlights() {
  document.querySelectorAll<HTMLElement>("[data-listing-error-highlight='true']").forEach((element) => {
    delete element.dataset.listingErrorHighlight;
    element.style.removeProperty("border-color");
    element.style.removeProperty("box-shadow");
    element.style.removeProperty("background-color");
    if (isNamedFormControl(element)) element.removeAttribute("aria-invalid");
  });
}

function markListingErrorElement(element: HTMLElement) {
  element.dataset.listingErrorHighlight = "true";
  element.style.borderColor = "#e11d48";
  element.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.14)";
  element.style.backgroundColor = "#fff1f2";
  if (isNamedFormControl(element)) element.setAttribute("aria-invalid", "true");
}

function applyListingErrorHighlights(formId: string, fieldErrors: Record<string, string>) {
  clearListingErrorHighlights();
  const errorNames = new Set(Object.keys(fieldErrors));
  if (!errorNames.size) return;

  for (const control of formControls(formId)) {
    if (errorNames.has(control.name)) markListingErrorElement(control);
  }

  document.querySelectorAll<HTMLElement>("[data-listing-error-target]").forEach((target) => {
    const targetNames = (target.dataset.listingErrorTarget ?? "").split(/\s+/).filter(Boolean);
    if (targetNames.some((name) => errorNames.has(name))) markListingErrorElement(target);
  });
}

function firstListingErrorElement(formId: string, fieldErrors: Record<string, string>) {
  const errorNames = new Set(Object.keys(fieldErrors));
  if (!errorNames.size) return null;
  const firstControl = formControls(formId).find((control) => errorNames.has(control.name));
  if (firstControl) return firstControl;

  return Array.from(document.querySelectorAll<HTMLElement>("[data-listing-error-target]")).find((target) => {
    const targetNames = (target.dataset.listingErrorTarget ?? "").split(/\s+/).filter(Boolean);
    return targetNames.some((name) => errorNames.has(name));
  }) ?? null;
}

function focusFirstListingError(formId: string, fieldErrors: Record<string, string>) {
  const firstErrorElement = firstListingErrorElement(formId, fieldErrors);
  if (!firstErrorElement) return;

  window.requestAnimationFrame(() => {
    firstErrorElement.scrollIntoView({ block: "center", behavior: "smooth" });
    if (isNamedFormControl(firstErrorElement)) firstErrorElement.focus({ preventScroll: true });
  });
}
