"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { processAccountDeletionAction } from "@/app/admin/users/actions";

export function DeleteUserButton({
  userId,
  userName,
  userEmail,
  disabled,
  disabledLabel = "Unavailable",
  csrfToken,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  disabled?: boolean;
  disabledLabel?: string;
  csrfToken: string;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function processDeletion() {
    const confirmed = window.confirm(`Delete and anonymize ${userName} (${userEmail})? This disables login and keeps booking/payment records for audit history.`);
    if (!confirmed) return;

    setMessage("");
    startTransition(async () => {
      const result = await processAccountDeletionAction(userId, csrfToken);
      setMessage(result.ok ? result.data.message : result.error);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={processDeletion}
        disabled={disabled || isPending}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-black/10 disabled:text-black/35 disabled:hover:bg-transparent"
      >
        <Trash2 size={16} />
        {isPending ? "Processing..." : disabled ? disabledLabel : "Delete"}
      </button>
      {message ? <p className="max-w-52 text-xs font-medium text-black/60">{message}</p> : null}
    </div>
  );
}
