"use client";

import Image from "next/image";
import type { PhotoTourGroup, PhotoTourPhoto } from "@/lib/room-photo-tour";

function photoCountLabel(count: number) {
  return `${count} photo${count === 1 ? "" : "s"}`;
}

function gridClassName(count: number) {
  if (count === 1) return "max-w-4xl";
  if (count === 2) return "grid gap-2 sm:grid-cols-2";
  return "grid auto-rows-[minmax(10rem,auto)] gap-2 min-[390px]:auto-rows-[minmax(12rem,auto)] sm:grid-cols-2 lg:grid-cols-3";
}

function tileClassName(count: number, index: number) {
  if (count === 1) return "aspect-[4/3]";
  if (count > 2 && index === 0) {
    return "aspect-[4/3] sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-[30rem]";
  }
  return "aspect-[4/3]";
}

function PhotoTile({
  photo,
  index,
  count,
  priority,
}: {
  photo: PhotoTourPhoto;
  index: number;
  count: number;
  priority: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-[#dedad2] ${tileClassName(count, index)}`}>
      <Image
        src={photo.imageUrl}
        alt={photo.alt}
        fill
        priority={priority}
        sizes={
          count === 1
            ? "(min-width: 1024px) 896px, 100vw"
            : index === 0 && count > 2
              ? "(min-width: 1024px) 680px, 100vw"
              : "(min-width: 1024px) 360px, 50vw"
        }
        className="object-cover"
      />
    </div>
  );
}

export function RoomPhotoTour({ groups }: { groups: PhotoTourGroup[] }) {
  if (!groups.length) return null;

  return (
    <div>
      <nav
        aria-label="Photo tour sections"
        className="sticky top-[4.75rem] z-30 -mx-5 border-y border-black/10 bg-white/95 px-5 py-3 backdrop-blur sm:top-20 sm:mx-0 sm:px-0 sm:py-4"
      >
        <div className="no-scrollbar touch-scroll flex snap-x gap-3 overflow-x-auto">
          {groups.map((group) => {
            const thumbnail = group.photos[0];
            return (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="group w-[6.25rem] shrink-0 snap-start text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#083f35] sm:w-[7.5rem]"
              >
                <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-[#dedad2] ring-1 ring-black/10">
                  <Image
                    src={thumbnail.imageUrl}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="mt-2 block truncate text-xs font-semibold text-[#111111]">{group.title}</span>
              </a>
            );
          })}
        </div>
      </nav>

      <div className="divide-y divide-black/10">
        {groups.map((group, groupIndex) => (
          <article
            key={group.id}
            id={group.id}
            className="grid scroll-mt-32 gap-5 py-8 first:pt-7 sm:scroll-mt-36 sm:py-12 sm:first:pt-9 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10"
          >
            <div className="lg:sticky lg:top-36 lg:self-start">
              <h3 className="break-words text-base font-semibold text-[#111111]">{group.title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/55">{group.summary || photoCountLabel(group.photos.length)}</p>
            </div>
            <div className={gridClassName(group.photos.length)}>
              {group.photos.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  index={index}
                  count={group.photos.length}
                  priority={groupIndex === 0 && index === 0}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
