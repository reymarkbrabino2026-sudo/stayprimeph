"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "Please wait...",
  className,
  pendingClassName,
  disabled,
}: {
  children: ReactNode;
  pendingText?: ReactNode;
  className: string;
  pendingClassName?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      disabled={isDisabled}
      className={`${className} ${pending ? pendingClassName ?? "opacity-70" : ""}`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <span className="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current" /> : null}
        {pending ? pendingText : children}
      </span>
    </button>
  );
}
