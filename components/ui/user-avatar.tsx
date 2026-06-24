"use client";

import { useState } from "react";
import Image from "next/image";
import { avatarFallbackText, isRenderableAvatarImage } from "@/lib/avatar";

type UserAvatarProps = {
  avatar?: string | null;
  name?: string | null;
  fallback?: string;
  className?: string;
  imageSizes?: string;
};

export function UserAvatar({
  avatar,
  name,
  fallback = "U",
  className = "",
  imageSizes = "32px",
}: UserAvatarProps) {
  const [failedAvatar, setFailedAvatar] = useState<string | undefined>();
  const trimmedAvatar = avatar?.trim();
  const imageSrc = trimmedAvatar !== failedAvatar && isRenderableAvatarImage(trimmedAvatar) ? trimmedAvatar : undefined;
  const label = name?.trim() || "User";

  return (
    <span className={`relative grid aspect-square shrink-0 place-items-center overflow-hidden rounded-full ${className}`} aria-label={label}>
      {imageSrc ? (
        <Image src={imageSrc} alt={label} fill sizes={imageSizes} className="object-cover" onError={() => setFailedAvatar(imageSrc)} />
      ) : (
        <span className="max-w-full truncate px-0.5 leading-none">{avatarFallbackText(avatar, name, fallback)}</span>
      )}
    </span>
  );
}
