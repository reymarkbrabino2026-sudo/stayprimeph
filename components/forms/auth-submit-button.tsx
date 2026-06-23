"use client";

import { useFormStatus } from "react-dom";

type AuthSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "host";
};

export function AuthSubmitButton({ label, pendingLabel = "Signing in", variant = "primary" }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();
  const className =
    variant === "host"
      ? "mt-2 grid min-h-12 w-full place-items-center rounded-2xl bg-[#083f35] px-5 py-3 font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#0b5144] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083f35] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:bg-[#083f35] disabled:hover:shadow-sm"
      : variant === "secondary"
      ? "mt-2 grid min-h-12 w-full place-items-center rounded-2xl border border-[#21170f]/15 bg-white py-4 font-semibold text-[#21170f] shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#21170f]/35 hover:bg-[#faf7f4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:border-[#21170f]/15 disabled:hover:bg-white disabled:hover:shadow-sm"
      : "mt-2 grid min-h-12 w-full place-items-center rounded-2xl bg-[#21170f] py-4 font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#352417] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:bg-[#21170f] disabled:hover:shadow-sm";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? pendingLabel : label}
      className={className}
    >
      {pending ? (
        <span
          className={`size-5 animate-spin rounded-full border-2 ${
            variant === "secondary" ? "border-[#21170f]/20 border-t-[#21170f]" : "border-white/35 border-t-white"
          }`}
          aria-hidden="true"
        />
      ) : (
        label
      )}
    </button>
  );
}
