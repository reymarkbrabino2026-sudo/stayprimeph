"use client";

import Image from "next/image";
import { amenityGroups, highlightOptions, propertyTypes } from "@/lib/host-wizard-data";
import { useHostWizardStore } from "@/stores/host-wizard-store";

function ListingPreviewIllustration() {
  return (
    <svg viewBox="0 0 560 400" role="img" aria-label="Illustrated home preview" className="h-full w-full">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
        <linearGradient id="lawn" x1="0" x2="1">
          <stop offset="0%" stopColor="#dcfce7" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
      </defs>

      <rect width="560" height="400" fill="url(#sky)" />
      <circle cx="458" cy="78" r="42" fill="#fed7aa" opacity="0.9" />
      <path d="M0 306C79 282 150 290 226 307C303 324 401 320 560 286V400H0Z" fill="url(#lawn)" />
      <path d="M86 288L256 145L433 288Z" fill="#a16207" />
      <path d="M118 281V185H397V281Z" fill="#fffaf0" />
      <path d="M256 145L118 258H397Z" fill="#92400e" />
      <rect x="145" y="219" width="74" height="62" rx="4" fill="#bfdbfe" />
      <rect x="284" y="219" width="74" height="62" rx="4" fill="#bfdbfe" />
      <rect x="233" y="214" width="48" height="67" rx="4" fill="#7c2d12" />
      <rect x="242" y="244" width="8" height="8" rx="4" fill="#fde68a" />
      <rect x="151" y="225" width="62" height="50" rx="2" fill="#dbeafe" opacity="0.55" />
      <rect x="290" y="225" width="62" height="50" rx="2" fill="#dbeafe" opacity="0.55" />
      <path d="M94 305C127 284 164 279 203 288C242 297 275 301 317 295C359 289 395 290 447 309" stroke="#16a34a" strokeLinecap="round" strokeWidth="10" />
      <path d="M75 298C92 268 105 251 118 244" stroke="#15803d" strokeLinecap="round" strokeWidth="8" />
      <path d="M462 311C446 274 431 252 414 242" stroke="#15803d" strokeLinecap="round" strokeWidth="8" />
      <circle cx="81" cy="286" r="22" fill="#86efac" />
      <circle cx="457" cy="292" r="26" fill="#86efac" />
      <path d="M83 166C99 154 118 149 139 151" stroke="#fdba74" strokeLinecap="round" strokeWidth="8" opacity="0.75" />
      <path d="M411 154C432 146 452 147 472 157" stroke="#fdba74" strokeLinecap="round" strokeWidth="8" opacity="0.75" />
    </svg>
  );
}

export function ListingPreviewCard() {
  const draft = useHostWizardStore((state) => state.draft);
  const cover = draft.photos.find((photo) => photo.isCover) ?? draft.photos[0];
  const selectedAmenities = amenityGroups
    .flatMap((group) => group.items)
    .filter((item, index, items) => draft.amenityIds.includes(item.id) && items.findIndex((candidate) => candidate.id === item.id) === index);
  const propertyType = propertyTypes.find((item) => item.id === draft.propertyType)?.label ?? "Home";
  const selectedHighlights = highlightOptions.filter((item) => draft.highlights.includes(item.id));

  return (
    <article className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
      <div className="relative aspect-[1.4/1] bg-black/[0.03]">
        {cover ? <Image src={cover.url} alt={draft.title || "Listing preview"} fill className="object-cover" unoptimized /> : <ListingPreviewIllustration />}
      </div>
      <div className="space-y-3 p-5">
        <h2 className="text-2xl font-semibold">{draft.title || `${propertyType} in ${draft.city || "your city"}`}</h2>
        <p className="text-black/60">{draft.city || "City"}, {draft.province || "Province"}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {selectedHighlights.map((item) => <span key={item.id} className="rounded-full bg-black/[0.04] px-3 py-1">{item.label}</span>)}
        </div>
        <p className="text-sm text-black/70">{selectedAmenities.slice(0, 4).map((item) => item.label).join(" · ")}</p>
      </div>
    </article>
  );
}

export function DescriptionInput() {
  const { draft, updateDraft } = useHostWizardStore();
  const selectedHighlights = highlightOptions.filter((item) => draft.highlights.includes(item.id));
  const propertyType = propertyTypes.find((item) => item.id === draft.propertyType)?.label.toLowerCase() ?? "place";
  const highlightPhrase =
    selectedHighlights.length === 0
      ? ""
      : selectedHighlights.length === 1
        ? selectedHighlights[0].label.toLowerCase()
        : `${selectedHighlights[0].label.toLowerCase()} and ${selectedHighlights[1].label.toLowerCase()}`;
  const suggestedDescription = highlightPhrase
    ? `This ${highlightPhrase} ${propertyType} is designed for a comfortable stay, with everything guests need to settle in and enjoy ${draft.city || "the area"}.`
    : "";

  return (
    <div className="space-y-4">
      {suggestedDescription ? (
        <section className="rounded-3xl border border-black/5 bg-black/[0.02] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">Suggested from your highlights</p>
              <p className="mt-3 max-w-xl text-base leading-7 text-black/70">{suggestedDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => updateDraft({ description: suggestedDescription })}
              className="min-h-11 shrink-0 rounded-full bg-black px-4 font-medium text-white transition hover:bg-black/85"
            >
              Use suggestion
            </button>
          </div>
        </section>
      ) : null}

      <label className="block">
        <span className="sr-only">Description</span>
        <textarea
          value={draft.description}
          placeholder="Tell guests what makes your place special…"
          onChange={(event) => updateDraft({ description: event.target.value.slice(0, 500) })}
          className="min-h-64 w-full rounded-3xl border p-5 text-lg outline-none transition placeholder:text-black/35 focus:border-black"
        />
        <span className="mt-2 block text-sm font-semibold text-black/60">{draft.description.length}/500</span>
      </label>
    </div>
  );
}


