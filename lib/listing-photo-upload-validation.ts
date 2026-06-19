import path from "node:path";
import sharp from "sharp";

export const listingPhotoAcceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export const maxListingPhotoUploadBytes = 4 * 1024 * 1024;
const maxListingPhotoPixels = 24_000_000;
const maxListingPhotoDimension = 8_000;
export const maxOptimizedListingPhotoDimension = 1600;

const acceptedExtensionsByType = new Map([
  ["image/jpeg", new Set(["jpg", "jpeg"])],
  ["image/png", new Set(["png"])],
  ["image/webp", new Set(["webp"])],
  ["image/avif", new Set(["avif"])],
]);

export type OptimizedListingPhotoFormat = "webp" | "avif";

export type OptimizedListingPhotoVariant = {
  format: OptimizedListingPhotoFormat;
  contentType: `image/${OptimizedListingPhotoFormat}`;
  extension: `.${OptimizedListingPhotoFormat}`;
  bytes: Buffer;
  width: number;
  height: number;
};

export type OptimizedListingPhotoImage = {
  primary: OptimizedListingPhotoVariant;
  variants: OptimizedListingPhotoVariant[];
  bytes: Buffer;
  width: number;
  height: number;
};

export function hasAcceptedListingPhotoExtension(fileName: string, type: string) {
  const extension = path.extname(fileName).toLowerCase().replace(".", "");
  return Boolean(extension && acceptedExtensionsByType.get(type)?.has(extension));
}

export function validateListingPhotoMetadata(input: { name: string; type: string; size: number }) {
  if (!listingPhotoAcceptedTypes.has(input.type) || !hasAcceptedListingPhotoExtension(input.name, input.type)) {
    return { ok: false as const, error: "Upload a JPG, PNG, WebP, or AVIF image.", status: 400 };
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
  if (type === "image/avif") {
    return bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" && bytes.toString("ascii", 8, 12) === "avif";
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
  if (type === "image/avif") return "heif";
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

  const normalized = image.resize({
    width: maxOptimizedListingPhotoDimension,
    height: maxOptimizedListingPhotoDimension,
    fit: "inside",
    withoutEnlargement: true,
  });

  const [webp, avif] = await Promise.all([
    normalized.clone().webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true }),
    normalized.clone().avif({ quality: 58, effort: 4 }).toBuffer({ resolveWithObject: true }),
  ]);

  const variants: OptimizedListingPhotoVariant[] = [
    {
      format: "webp",
      contentType: "image/webp",
      extension: ".webp",
      bytes: webp.data,
      width: webp.info.width,
      height: webp.info.height,
    },
    {
      format: "avif",
      contentType: "image/avif",
      extension: ".avif",
      bytes: avif.data,
      width: avif.info.width,
      height: avif.info.height,
    },
  ];

  return {
    primary: variants[0],
    variants,
    bytes: variants[0].bytes,
    width: variants[0].width,
    height: variants[0].height,
  } satisfies OptimizedListingPhotoImage;
}

export async function sanitizeListingPhotoImage(bytes: Buffer, type: string) {
  try {
    const optimizedImage = await reencodeListingPhoto(bytes, type);
    return { ok: true as const, ...optimizedImage };
  } catch {
    return { ok: false as const, error: "The uploaded image could not be safely processed.", status: 400 };
  }
}
