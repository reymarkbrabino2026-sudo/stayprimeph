import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME } from "@/lib/utils";

export function DatePicker() {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-white">
      <div className="p-4">
        <p className="text-xs">Check-in</p>
        <p className="font-semibold">Select date</p>
        <p className="mt-1 text-xs text-black/50">{STANDARD_CHECK_IN_TIME}</p>
      </div>
      <div className="border-l p-4">
        <p className="text-xs">Check-out</p>
        <p className="font-semibold">Select date</p>
        <p className="mt-1 text-xs text-black/50">{STANDARD_CHECK_OUT_TIME}</p>
      </div>
    </div>
  );
}
