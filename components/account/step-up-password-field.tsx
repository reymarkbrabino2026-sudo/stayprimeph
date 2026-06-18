"use client";

export function StepUpPasswordField({
  required,
  value,
  onChange,
}: {
  required: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!required) return null;

  return (
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
  );
}
