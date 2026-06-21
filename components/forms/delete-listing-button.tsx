"use client";

import { Trash2 } from "lucide-react";
import { deleteListing } from "@/app/host/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";

export function DeleteListingButton({ listingId, csrfToken }: { listingId: string; csrfToken?: string }) {
  return (
    <form
      action={deleteListing}
      onSubmit={(event) => {
        if (!window.confirm("Delete this listing permanently? This can't be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={listingId} />
      {csrfToken ? <input type="hidden" name={csrfFieldName} value={csrfToken} /> : null}
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        <Trash2 size={16} aria-hidden="true" /> Delete listing
      </button>
    </form>
  );
}
