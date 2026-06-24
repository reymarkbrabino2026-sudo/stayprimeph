"use client";

import Link from "next/link";

export function StepUpPasswordField({
  required,
  value,
  onChange,
  resetHref = "/forgot-password",
}: {
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  resetHref?: string;
}) {
  if (!required) return null;

  return (
    <div className="grid gap-2">
      <label className="grid gap-2 font-semibold">
        <span>Current password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 rounded-xl border border-black/15 bg-white px-4 font-normal outline-none transition focus:border-[#083f35]"
          required
        />
      </label>
      <Link href={resetHref} className="w-fit text-sm font-semibold text-[#a8431f] underline-offset-4 hover:underline">
        Forgot password?
      </Link>
    </div>
  );
}
