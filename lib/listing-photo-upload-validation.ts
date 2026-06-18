import path from "node:path";
import sharp from "sharp";

export const listingPhotoAcceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const maxListingPhotoUploadBytes = 4 * 1024 * 1024;
const maxListingPhotoPixels = 24_000_000;
const maxListingPhotoDimension = 8_000;

const acceptedExtensionsByType = new Map([
  ["image/jpeg", new Set(["jpg", "jpeg"])],
  ["image/png", new Set(["png"])],
  ["image/webp", new Set(["webp"])],
]);

export function hasAcceptedListingPhotoExtension(fileName: string, type: string) {
  const extension = path.extname(fileName).toLowerCase().replace(".", "");
  return Boolean(extension && acceptedExtensionsByType.get(type)?.has(extension));
}

export function validateListingPhotoMetadata(input: { name: string; type: string; size: number }) {
  if (!listingPhotoAcceptedTypes.has(input.type) || !hasAcceptedListingPhotoExtension(input.name, input.type)) {
    return { ok: false as const, error: "Upload a JPG, PNG, or WebP image.", status: 400 };
  }

  if (input.size > maxListingPhotoUploadBytes) {
    return { ok: false as const, error: "Upload an image smaller than 4 MB.", status: 413 };
  }

  return { ok: true as const };
}

export function hasExpectedListingPhotoSignature(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return bytes.length >= pngSignature.length && bytes.subarray(0, pngSignature.length).equals(pngSignature);
  }
  if (type === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export function validateListingPhotoBytes(bytes: Buffer, type: string) {
  if (!hasExpectedListingPhotoSignature(bytes, type)) {
    return { ok: false as const, error: "The uploaded file does not match its image type.", status: 400 };
  }

  return { ok: true as const };
}

function expectedSharpFormat(type: string) {
  if (type === "image/jpeg") return "jpeg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return null;
}

async function reencodeListingPhoto(bytes: Buffer, type: string) {
  const image = sharp(bytes, {
    animated: false,
    failOn: "warning",
    limitInputPixels: maxListingPhotoPixels,
  }).rotate();
  const metadata = await image.metadata();
  const expectedFormat = expectedSharpFormat(type);

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > maxListingPhotoDimension ||
    metadata.height > maxListingPhotoDimension ||
    metadata.pages && metadata.pages > 1 ||
    !expectedFormat ||
    metadata.format !== expectedFormat
  ) {
    throw new Error("Unsupported image payload.");
  }

  if (type === "image/jpeg") return image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  if (type === "image/png") return image.png({ compressionLevel: 9, palette: false }).toBuffer();
  if (type === "image/webp") return image.webp({ quality: 85 }).toBuffer();

  throw new Error("Unsupported image payload.");
}

export async function sanitizeListingPhotoImage(bytes: Buffer, type: string) {
  try {
    const sanitizedBytes = await reencodeListingPhoto(bytes, type);
    return { ok: true as const, bytes: sanitizedBytes };
  } catch {
    return { ok: false as const, error: "The uploaded image could not be safely processed.", status: 400 };
  }
}
