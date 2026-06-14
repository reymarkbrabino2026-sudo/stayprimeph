"use client";

import { useFormStatus } from "react-dom";

export function AuthSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? "Signing in" : label}
      className="mt-2 grid min-h-12 w-full place-items-center rounded-2xl bg-[#21170f] py-4 font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#352417] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:bg-[#21170f] disabled:hover:shadow-sm"
    >
      {pending ? (
        <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
      ) : (
        label
      )}
    </button>
  );
}
