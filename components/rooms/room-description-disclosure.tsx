"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function RoomDescriptionDisclosure({
  description,
  propertyTypeLabel,
  locationLabel,
  bedroomsLabel,
  bathsLabel,
  maxGuests,
  amenities,
  rules,
}: {
  description: string;
  propertyTypeLabel: string;
  locationLabel: string;
  bedroomsLabel: string;
  bathsLabel: string;
  maxGuests: number;
  amenities: string[];
  rules: string[];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogId = useId();
  const visibleAmenities = amenities.slice(0, 8);
  const visibleRules = rules.slice(0, 5);
  const amenitySummary = amenities.slice(0, 4).join(", ");
  const spaceSummary = `This ${propertyTypeLabel.toLowerCase()} accommodates up to ${pluralize(maxGuests, "guest")} with ${bedroomsLabel.toLowerCase()} and ${bathsLabel.toLowerCase()}. It is set in ${locationLabel}${amenitySummary ? ` and includes ${amenitySummary}.` : "."}`;

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div>
      <p className="line-clamp-3 text-2xl font-medium leading-10 text-black sm:text-3xl">
        {description}
      </p>
      <button
        type="button"
        aria-controls={dialogId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#111111] shadow-[0_8px_24px_rgb(0_0_0_/_0.08)] transition hover:bg-[#f4eadc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
      >
        Show more
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/55 p-0 sm:items-center sm:justify-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="safe-bottom w-full max-h-[86svh] overflow-y-auto rounded-t-[1.75rem] bg-white px-6 pb-8 pt-5 text-[#222222] shadow-[0_24px_70px_rgb(0_0_0_/_0.24)] sm:max-w-[48rem] sm:rounded-[1.75rem] sm:px-8 sm:pb-9"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-6 mb-8 flex items-center bg-white px-6 pb-3 pt-1 sm:-mx-8 sm:px-8">
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-full text-black transition hover:bg-black/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#083f35]"
              >
                <X size={20} />
              </button>
            </div>

            <h2 id={titleId} className="text-3xl font-semibold leading-tight">
              About this space
            </h2>
            <div id={descriptionId} className="mt-8 space-y-8 text-base leading-7 text-black/78 sm:text-lg sm:leading-8">
              <p>{description}</p>

              <section aria-labelledby={`${titleId}-space`}>
                <h3 id={`${titleId}-space`} className="text-base font-semibold text-black sm:text-lg">
                  The space
                </h3>
                <p className="mt-2">{spaceSummary}</p>
              </section>

              {visibleAmenities.length ? (
                <section aria-labelledby={`${titleId}-offers`}>
                  <h3 id={`${titleId}-offers`} className="text-base font-semibold text-black sm:text-lg">
                    What this place offers
                  </h3>
                  <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {visibleAmenities.map((amenity) => (
                      <li key={amenity} className="text-black/72">
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {visibleRules.length ? (
                <section aria-labelledby={`${titleId}-rules`}>
                  <h3 id={`${titleId}-rules`} className="text-base font-semibold text-black sm:text-lg">
                    Good to know
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {visibleRules.map((rule) => (
                      <li key={rule} className="text-black/72">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
