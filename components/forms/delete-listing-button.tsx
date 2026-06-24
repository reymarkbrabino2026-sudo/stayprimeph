"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { deleteListing } from "@/app/host/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";

export function DeleteListingButton({ listingId, csrfToken }: { listingId: string; csrfToken?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    if (isPending) return;
    setOpen(false);
    setMessage("");
  }

  function confirmDelete() {
    const formData = new FormData();
    formData.set("id", listingId);
    if (csrfToken) formData.set(csrfFieldName, csrfToken);

    setMessage("");
    startTransition(async () => {
      try {
        await deleteListing(formData);
        setOpen(false);
        router.replace("/host/listings?deleted=1");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Listing could not be deleted.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        <Trash2 size={16} aria-hidden="true" /> Delete listing
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="delete-listing-title">
          <div className="w-full rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-[1.5rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
                  <AlertTriangle size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">Delete listing</p>
                  <h2 id="delete-listing-title" className="mt-1 text-2xl font-bold">Delete this listing?</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="grid size-10 shrink-0 place-items-center rounded-full border bg-white text-black/65 transition hover:bg-black/[0.04] disabled:opacity-50"
                aria-label="Close delete listing dialog"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800">
              This permanently removes the listing from your host dashboard and public search. This cannot be undone.
              Listings with active bookings are protected and will not be deleted.
            </div>

            {message ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{message}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="min-h-12 rounded-full border px-5 font-semibold transition hover:bg-black/[0.04] disabled:opacity-60"
              >
                Keep listing
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-red-700 px-5 font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
              >
                <Trash2 size={16} aria-hidden="true" />
                {isPending ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
