import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/[_-]/g, " ");
  const tone =
    status === "approved" || status === "confirmed" || status === "paid" || status === "completed" || status === "closed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "submitted" || status === "refunded"
        ? "bg-sky-100 text-sky-700"
      : status === "pending" || status === "review"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", tone)}>{label}</span>;
}
