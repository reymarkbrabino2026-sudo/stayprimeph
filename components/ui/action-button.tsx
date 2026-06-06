'use client';

export function ActionButton({
  label,
  className = "",
  message = "This action will be connected in a later step.",
}: {
  label: string;
  className?: string;
  message?: string;
}) {
  return (
    <button type="button" onClick={() => window.alert(message)} className={className}>
      {label}
    </button>
  );
}
