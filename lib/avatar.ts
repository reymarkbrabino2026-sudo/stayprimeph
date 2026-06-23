export function isRenderableAvatarImage(src?: string | null) {
  const value = src?.trim();
  return Boolean(value && (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")));
}

export function initialsFromName(name?: string | null, fallback = "U") {
  return name?.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || fallback;
}

export function avatarFallbackText(avatar?: string | null, name?: string | null, fallback = "U") {
  const value = avatar?.trim();
  if (value && !isRenderableAvatarImage(value)) return value.slice(0, 2).toUpperCase();
  return initialsFromName(name, fallback);
}
