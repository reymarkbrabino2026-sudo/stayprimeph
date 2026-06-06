function isLocalAppUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function requiresConfiguredPhotoStorage() {
  if (hasVercelBlobConfig()) return false;
  if (process.env.VERCEL) return true;
  return process.env.NODE_ENV === "production" && !isLocalAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getPhotoBlobReadWriteToken() {
  return process.env.PHOTO_BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

export function hasVercelBlobConfig() {
  return Boolean(getPhotoBlobReadWriteToken());
}
