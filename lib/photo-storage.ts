export function requiresConfiguredPhotoStorage() {
  return !hasVercelBlobConfig();
}

export function getPhotoBlobReadWriteToken() {
  return process.env.PHOTO_BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

export function hasVercelBlobConfig() {
  return Boolean(getPhotoBlobReadWriteToken());
}
