import path from "node:path";
import sharp from "sharp";

export const listingPhotoAcceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export const maxListingPhotoUploadBytes = 4 * 1024 * 1024;
const maxListingPhotoPixels = 24_000_000;
const maxListingPhotoDimension = 8_000;
const minModeratedImageDimension = 48;
const minModeratedImageEntropy = 0.05;
const minModeratedChannelRange = 8;
const minModeratedChannelStdev = 2;
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

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false as const, error: "Upload a non-empty image.", status: 400 };
  }

  if (input.size > maxListingPhotoUploadBytes) {
    return { ok: false as const, error: "Upload an image smaller than 4 MB.", status: 413 };
  }

  return { ok: true as const };
}

function hasAvifBrand(bytes: Buffer) {
  if (bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp") return false;

  for (let offset = 8; offset + 4 <= Math.min(bytes.length, 40); offset += 4) {
    const brand = bytes.toString("ascii", offset, offset + 4);
    if (brand === "avif" || brand === "avis") return true;
  }

  return false;
}

export function sniffListingPhotoMime(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8) {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (bytes.subarray(0, pngSignature.length).equals(pngSignature)) return "image/png";
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (hasAvifBrand(bytes)) return "image/avif";

  return null;
}

export function hasExpectedListingPhotoSignature(bytes: Buffer, type: string) {
  return sniffListingPhotoMime(bytes) === type;
}

export function validateListingPhotoBytes(bytes: Buffer, type: string) {
  if (!bytes.length) {
    return { ok: false as const, error: "Upload a non-empty image.", status: 400 };
  }

  if (bytes.length > maxListingPhotoUploadBytes) {
    return { ok: false as const, error: "Upload an image smaller than 4 MB.", status: 413 };
  }

  const sniffedType = sniffListingPhotoMime(bytes);
  if (!sniffedType || sniffedType !== type) {
    return { ok: false as const, error: "The uploaded file does not match its image type.", status: 400 };
  }

  return { ok: true as const };
}

const eicarTestSignature = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*", "ascii");
const suspiciousBinarySignatures = [
  { reason: "eicar-test-file", bytes: eicarTestSignature },
  { reason: "embedded-windows-executable", bytes: Buffer.from([0x4d, 0x5a, 0x90, 0x00]) },
  { reason: "embedded-elf-executable", bytes: Buffer.from([0x7f, 0x45, 0x4c, 0x46]) },
  { reason: "embedded-pdf", bytes: Buffer.from("%PDF-", "ascii") },
  { reason: "embedded-zip-archive", bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
  { reason: "embedded-rar-archive", bytes: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]) },
  { reason: "embedded-7z-archive", bytes: Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]) },
];
const suspiciousTextPayloads = [
  { reason: "embedded-html", pattern: "<!doctype html" },
  { reason: "embedded-html", pattern: "<html" },
  { reason: "embedded-script", pattern: "<script" },
  { reason: "embedded-php", pattern: "<?php" },
  { reason: "embedded-javascript-uri", pattern: "javascript:" },
];

export function scanListingPhotoForMalware(bytes: Buffer) {
  for (const signature of suspiciousBinarySignatures) {
    if (bytes.includes(signature.bytes)) {
      return {
        ok: false as const,
        error: "The uploaded image did not pass the security scan.",
        status: 400,
        reason: signature.reason,
      };
    }
  }

  const lowerPayload = bytes.toString("latin1").toLowerCase();
  for (const payload of suspiciousTextPayloads) {
    if (lowerPayload.includes(payload.pattern)) {
      return {
        ok: false as const,
        error: "The uploaded image did not pass the security scan.",
        status: 400,
        reason: payload.reason,
      };
    }
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

export async function moderateListingPhotoImage(image: OptimizedListingPhotoImage) {
  try {
    if (image.width < minModeratedImageDimension || image.height < minModeratedImageDimension) {
      return { ok: false as const, error: "Upload a clear image with enough visual detail.", status: 422, reason: "too-small" };
    }

    const stats = await sharp(image.primary.bytes, {
      animated: false,
      failOn: "warning",
      limitInputPixels: maxListingPhotoPixels,
    }).stats();

    const hasVisibleDetail = stats.channels.slice(0, 3).some((channel) =>
      channel.max - channel.min >= minModeratedChannelRange || channel.stdev >= minModeratedChannelStdev,
    );

    if (stats.entropy < minModeratedImageEntropy || !hasVisibleDetail) {
      return { ok: false as const, error: "Upload a clear image with enough visual detail.", status: 422, reason: "low-detail" };
    }

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "The uploaded image could not be accepted by moderation.", status: 422, reason: "unreadable" };
  }
}
