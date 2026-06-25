import { ExternalLink, PlayCircle } from "lucide-react";
import type { Property } from "@/lib/types";
import { getVirtualTourEmbed, normalizeVirtualTourUrl } from "@/lib/virtual-tour";

export function RoomVirtualTour({ property }: { property: Pick<Property, "title" | "virtualTourUrl"> }) {
  const tourUrl = normalizeVirtualTourUrl(property.virtualTourUrl);
  if (!tourUrl) return null;

  const embed = getVirtualTourEmbed(tourUrl);

  return (
    <section id="virtual-tour" className="scroll-mt-32 border-t border-black/10 bg-[#f4efe7] py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a6a3f]">Virtual tour</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">Walk through before you book</h2>
            <p className="mt-3 max-w-2xl leading-7 text-black/62">Explore the space from room to room and get a clearer feel for the layout.</p>
          </div>
          <a
            href={tourUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28] lg:justify-self-end"
          >
            <ExternalLink size={17} /> Open full tour
          </a>
        </div>

        {embed ? (
          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-black/10 bg-black shadow-[0_18px_50px_rgb(0_0_0_/_0.14)]">
            <div className="relative min-h-[22rem] aspect-[16/10]">
              <iframe
                title={`Virtual tour of ${property.title}`}
                src={embed.embedUrl}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#111] px-5 py-4 text-white">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <PlayCircle size={17} /> {embed.providerLabel} tour
              </span>
              <a href={embed.originalUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#f4d7a1] hover:text-white">
                View in provider
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[1.75rem] border border-black/10 bg-white p-7">
            <p className="max-w-2xl leading-7 text-black/65">This host added a virtual tour link. Open it in a new tab to view the walkthrough.</p>
          </div>
        )}
      </div>
    </section>
  );
}
