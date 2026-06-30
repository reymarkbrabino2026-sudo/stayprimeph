import { getListingVideoEmbed } from "@/lib/listing-video";
import type { Property } from "@/lib/types";

export function RoomListingVideo({ property }: { property: Pick<Property, "title" | "listingVideoUrl"> }) {
  const video = getListingVideoEmbed(property.listingVideoUrl);
  if (!video) return null;

  return (
    <section id="video" className="scroll-mt-28 bg-[#efefed] pb-12 sm:scroll-mt-32 sm:pb-24">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-[#0f5750] min-[390px]:text-sm">Video</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-black min-[390px]:text-4xl sm:text-6xl">Watch the stay in motion.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/65">
            A quick hosted preview before you move into the photo tour.
          </p>
        </div>
        <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-black/10 bg-black shadow-[0_20px_60px_rgb(0_0_0_/_0.16)]">
          <iframe
            src={video.embedUrl}
            title={`${property.title} video`}
            className="aspect-video w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
