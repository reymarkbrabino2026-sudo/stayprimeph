import Image from "next/image";
import type { Property } from "@/lib/types";

function isRenderableImage(src?: string) {
  return Boolean(src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

function GalleryTile({ src, alt, className, priority = false }: { src?: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-100 via-orange-50 to-stone-100 ${className ?? ""}`}>
      {isRenderableImage(src) ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover"
          preload={priority}
          loading={priority ? "eager" : undefined}
        />
      ) : null}
    </div>
  );
}

export function PropertyGallery({ property }: { property: Property }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <GalleryTile src={property.images[0]?.imageUrl} alt={property.title} className="min-h-[320px]" priority />
      <div className="grid gap-4 sm:grid-cols-2">
        {property.images.slice(1, 5).map((image, index) => (
          <GalleryTile key={image.id} src={image.imageUrl} alt={`${property.title} ${index + 2}`} className="min-h-[150px]" />
        ))}
      </div>
    </div>
  );
}
