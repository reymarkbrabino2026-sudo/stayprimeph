const canonicalPathnames: Record<string, string> = {
  "/guest/wishlists": "/guest/wishlist",
  "/guest/wishlist": "/guest/wishlist",
  "/guest/trips": "/guest/bookings",
  "/guest/bookings": "/guest/bookings",
  "/guest/messages": "/guest/messages",
  "/guest/profile": "/guest/profile",
  "/guest/notifications": "/guest/notifications",
  "/account-settings": "/account-settings",
  "/account-settings/notifications": "/account-settings/notifications",
  "/account-settings/languages-and-currency": "/account-settings/languages-and-currency",
  "/support/help-center": "/support/help-center",
};

export function getCanonicalPathname(pathname: string) {
  return canonicalPathnames[pathname.toLowerCase()] ?? null;
}

export function normalizeKnownAppPath(path: string) {
  try {
    const url = new URL(path, "http://stayprimeph.local");
    const canonicalPathname = getCanonicalPathname(url.pathname);
    return canonicalPathname ? `${canonicalPathname}${url.search}${url.hash}` : path;
  } catch {
    return path;
  }
}
