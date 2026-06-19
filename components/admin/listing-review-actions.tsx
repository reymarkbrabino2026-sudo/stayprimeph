"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveListing, rejectListing } from "@/app/admin/listings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";

type ReviewAction = "approved" | "rejected";
type ListingReviewActionsVariant = "dashboard" | "table";

type ListingReviewActionsProps = {
  listingId: string;
  csrfToken: string;
  variant?: ListingReviewActionsVariant;
};

export function ListingReviewActions({ listingId, csrfToken, variant = "dashboard" }: ListingReviewActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [completedAction, setCompletedAction] = useState<ReviewAction | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || Boolean(pendingAction) || Boolean(completedAction);
  const isTable = variant === "table";

  function reviewListing(nextStatus: ReviewAction) {
    const formData = new FormData();
    formData.set(csrfFieldName, csrfToken);
    formData.set("id", listingId);

    setMessage("");
    setCompletedAction(null);
    setPendingAction(nextStatus);
    startTransition(async () => {
      try {
        if (nextStatus === "approved") {
          await approveListing(formData);
        } else {
          await rejectListing(formData);
        }
        setCompletedAction(nextStatus);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not update listing.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className={isTable ? "flex flex-col gap-2" : "mt-5 space-y-2"}>
      <div className={isTable ? "flex gap-2" : "flex gap-2"}>
        <button
          type="button"
          onClick={() => reviewListing("approved")}
          disabled={disabled}
          className={
            isTable
              ? "min-w-20 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/35"
              : "min-h-11 flex-1 rounded-full bg-black px-4 font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/35"
          }
        >
          {pendingAction === "approved" ? "Approving..." : completedAction === "approved" ? "Approved" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => reviewListing("rejected")}
          disabled={disabled}
          className={
            isTable
              ? "min-w-20 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/35"
              : "min-h-11 flex-1 rounded-full border border-black/10 px-4 font-semibold transition hover:border-black/30 hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:border-black/10 disabled:text-black/35"
          }
        >
          {pendingAction === "rejected" ? "Rejecting..." : completedAction === "rejected" ? "Rejected" : "Reject"}
        </button>
      </div>
      {message ? <p className="text-xs font-medium text-red-600" role="status">{message}</p> : null}
    </div>
  );
}
