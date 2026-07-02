"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { HostCustomerClassification } from "@/lib/types";

type CustomerClassificationSelectProps = {
  action: (formData: FormData) => void | Promise<void>;
  customerName: string;
  guestId: string;
  hostId: string;
  returnTo: string;
  value: HostCustomerClassification;
};

export function CustomerClassificationSelect({
  action,
  customerName,
  guestId,
  hostId,
  returnTo,
  value,
}: CustomerClassificationSelectProps) {
  const [current, setCurrent] = useState(value);
  const vip = current === "vip";

  return (
    <form action={action} className="relative inline-flex min-w-0 shrink-0">
      <input type="hidden" name="guestId" value={guestId} />
      <input type="hidden" name="hostId" value={hostId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="classification"
        value={current}
        aria-label={`Customer type for ${customerName}`}
        onChange={(event) => {
          setCurrent(event.currentTarget.value as HostCustomerClassification);
          event.currentTarget.form?.requestSubmit();
        }}
        className={`min-h-9 min-w-28 appearance-none rounded-lg border py-1.5 pl-3 pr-9 text-xs font-bold outline-none transition focus:ring-2 focus:ring-[#f97316]/25 sm:min-w-32 ${
          vip
            ? "border-orange-200 bg-orange-50 text-orange-700"
            : "border-black/10 bg-white text-black/65"
        }`}
      >
        <option value="ordinary">Ordinary</option>
        <option value="vip">VIP</option>
      </select>
      <ChevronDown className={`pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 ${vip ? "text-orange-700" : "text-black/40"}`} aria-hidden="true" />
    </form>
  );
}
