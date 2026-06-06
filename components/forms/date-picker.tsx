export function DatePicker() {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-white">
      <div className="p-4">
        <p className="text-xs">Check-in</p>
        <p className="font-semibold">Select date</p>
      </div>
      <div className="border-l p-4">
        <p className="text-xs">Check-out</p>
        <p className="font-semibold">Select date</p>
      </div>
    </div>
  );
}
