"use client";

import { useFormStatus } from "react-dom";

type BookingActionSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className: string;
  spinnerClassName?: string;
};

export function BookingActionSubmitButton({
  label,
  pendingLabel,
  className,
  spinnerClassName = "border-current/25 border-t-current",
}: BookingActionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <span className={`size-3.5 animate-spin rounded-full border-2 ${spinnerClassName}`} aria-hidden="true" /> : null}
        {pending ? pendingLabel : label}
      </span>
    </button>
  );
}
