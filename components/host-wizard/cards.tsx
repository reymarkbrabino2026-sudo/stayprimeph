"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function OptionCard({ selected, title, description, icon, onClick, children }: { selected: boolean; title: string; description?: string; icon?: ReactNode; onClick: () => void; children?: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`min-h-28 rounded-2xl border p-4 text-left transition ${selected ? "border-2 border-[#222] bg-black/[0.02]" : "bg-white hover:border-black/40"}`}
    >
      <div className="mb-4 text-2xl">{icon}</div>
      <div className="font-semibold">{title}</div>
      {description ? <p className="mt-1 text-sm text-black/60">{description}</p> : null}
      {children}
    </motion.button>
  );
}

export function CounterInput({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b py-5 last:border-b-0">
      <span className="text-lg">{label}</span>
      <div className="flex items-center gap-4">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-black/[0.04] text-xl">-</button>
        <span className="w-5 text-center">{value}</span>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(value + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-black/[0.04] text-xl">+</button>
      </div>
    </div>
  );
}

export function AmenityCard({ selected, title, icon, onClick }: { selected: boolean; title: string; icon: ReactNode; onClick: () => void }) {
  return <OptionCard selected={selected} title={title} icon={icon} onClick={onClick} />;
}

