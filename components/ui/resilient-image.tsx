"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useState } from "react";

function isRenderableImage(src?: string) {
  return Boolean(src && src !== "pending-upload" && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")));
}

export function ImageFallback({ label = "Photo unavailable" }: { label?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-rose-50 via-orange-50 to-stone-100 text-center text-black/45">
      <div className="grid gap-2">
        <ImageIcon className="mx-auto" size={28} strokeWidth={1.8} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

export function ResilientImage({
  src,
  alt,
  sizes,
  priority,
  className = "object-cover",
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!isRenderableImage(src) || failed) {
    return <ImageFallback />;
  }

  return (
    <Image
      src={src!}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
