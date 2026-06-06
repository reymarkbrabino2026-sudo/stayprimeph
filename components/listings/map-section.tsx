import { MapPin } from "lucide-react";

export function MapSection({ locationLabel = "Exact address shared after confirmed booking" }: { locationLabel?: string }) {
  return (
    <div className="relative min-h-64 overflow-hidden rounded-[1.75rem] bg-[#e8efe8]">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0_40%,rgb(255_255_255_/_0.7)_40%_42%,transparent_42%_100%),linear-gradient(25deg,transparent_0_52%,rgb(255_255_255_/_0.65)_52%_54%,transparent_54%_100%),radial-gradient(circle_at_28%_32%,rgb(8_63_53_/_0.22),transparent_15%),radial-gradient(circle_at_70%_58%,rgb(226_172_76_/_0.2),transparent_18%)]" />
      <div className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#083f35] text-white shadow-lg ring-8 ring-white/80">
        <MapPin size={24} />
      </div>
      <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#083f35]">Approximate location</p>
        <p className="mt-1 text-sm text-black/60">{locationLabel}</p>
      </div>
    </div>
  );
}
