import { describe, expect, test } from "vitest";
import sharp from "sharp";
import {
  maxOptimizedListingPhotoDimension,
  maxListingPhotoUploadBytes,
  moderateListingPhotoImage,
  sanitizeListingPhotoImage,
  scanListingPhotoForMalware,
  sniffListingPhotoMime,
  validateListingPhotoBytes,
  validateListingPhotoMetadata,
} from "@/lib/listing-photo-upload-validation";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpgSignature = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const webpSignature = Buffer.from("RIFFxxxxWEBP", "ascii");
const eicarSignature = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*", "ascii");

async function createDetailedPng(width = 96, height = 96) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = (index * 37) % 256;
  }

  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe("listing photo upload validation", () => {
  test("keeps MIME type and extension checks paired", () => {
    expect(validateListingPhotoMetadata({ name: "photo.jpg", type: "image/jpeg", size: 100 })).toEqual({ ok: true });
    expect(validateListingPhotoMetadata({ name: "photo.jpeg", type: "image/jpeg", size: 100 })).toEqual({ ok: true });
    expect(validateListingPhotoMetadata({ name: "photo.png", type: "image/png", size: 100 })).toEqual({ ok: true });
    expect(validateListingPhotoMetadata({ name: "photo.webp", type: "image/webp", size: 100 })).toEqual({ ok: true });
    expect(validateListingPhotoMetadata({ name: "photo.avif", type: "image/avif", size: 100 })).toEqual({ ok: true });
    expect(validateListingPhotoMetadata({ name: "photo.jpg", type: "image/png", size: 100 })).toMatchObject({ ok: false, status: 400 });
    expect(validateListingPhotoMetadata({ name: "photo.svg", type: "image/svg+xml", size: 100 })).toMatchObject({ ok: false, status: 400 });
  });

  test("keeps the upload size limit", () => {
    expect(validateListingPhotoMetadata({ name: "photo.png", type: "image/png", size: maxListingPhotoUploadBytes })).toEqual({ ok: true });
    expect(validateListingPhotoMetadata({ name: "photo.png", type: "image/png", size: maxListingPhotoUploadBytes + 1 })).toMatchObject({ ok: false, status: 413 });
    expect(validateListingPhotoMetadata({ name: "photo.png", type: "image/png", size: 0 })).toMatchObject({ ok: false, status: 400 });

    const oversizedBytes = Buffer.concat([pngSignature, Buffer.alloc(maxListingPhotoUploadBytes)]);
    expect(validateListingPhotoBytes(oversizedBytes, "image/png")).toMatchObject({ ok: false, status: 413 });
  });

  test("keeps magic-byte signature checks", async () => {
    const avif = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: "#ff385c",
      },
    }).avif().toBuffer();

    expect(sniffListingPhotoMime(jpgSignature)).toBe("image/jpeg");
    expect(sniffListingPhotoMime(pngSignature)).toBe("image/png");
    expect(sniffListingPhotoMime(webpSignature)).toBe("image/webp");
    expect(sniffListingPhotoMime(avif)).toBe("image/avif");
    expect(validateListingPhotoBytes(jpgSignature, "image/jpeg")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(pngSignature, "image/png")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(webpSignature, "image/webp")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(avif, "image/avif")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(pngSignature, "image/jpeg")).toMatchObject({ ok: false, status: 400 });
    expect(validateListingPhotoBytes(Buffer.from("not an image"), "image/png")).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects known malware and polyglot payload markers before image processing", () => {
    expect(scanListingPhotoForMalware(Buffer.concat([pngSignature, eicarSignature]))).toMatchObject({ ok: false, status: 400, reason: "eicar-test-file" });
    expect(scanListingPhotoForMalware(Buffer.concat([jpgSignature, Buffer.from("<script>alert(1)</script>", "utf8")]))).toMatchObject({ ok: false, status: 400, reason: "embedded-script" });
    expect(scanListingPhotoForMalware(Buffer.concat([pngSignature, Buffer.from([0x50, 0x4b, 0x03, 0x04])]))).toMatchObject({ ok: false, status: 400, reason: "embedded-zip-archive" });
    expect(scanListingPhotoForMalware(pngSignature)).toEqual({ ok: true });
  });

  test("moderates sanitized images for usable visual detail", async () => {
    const detailed = await createDetailedPng();
    const detailedSanitized = await sanitizeListingPhotoImage(detailed, "image/png");
    expect(detailedSanitized.ok).toBe(true);
    if (!detailedSanitized.ok) return;
    await expect(moderateListingPhotoImage(detailedSanitized)).resolves.toEqual({ ok: true });

    const blank = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: "#ffffff",
      },
    }).png().toBuffer();
    const blankSanitized = await sanitizeListingPhotoImage(blank, "image/png");
    expect(blankSanitized.ok).toBe(true);
    if (!blankSanitized.ok) return;
    await expect(moderateListingPhotoImage(blankSanitized)).resolves.toMatchObject({ ok: false, status: 422, reason: "low-detail" });
  });

  test("optimizes images before storage and strips trailing payload bytes", async () => {
    const original = await sharp({
      create: {
        width: 2400,
        height: 1800,
        channels: 3,
        background: "#ff385c",
      },
    }).png().toBuffer();
    const payload = Buffer.from("SHOULD_NOT_SURVIVE_REENCODE");
    const withTrailingPayload = Buffer.concat([original, payload]);

    expect(validateListingPhotoBytes(withTrailingPayload, "image/png")).toEqual({ ok: true });
    const sanitized = await sanitizeListingPhotoImage(withTrailingPayload, "image/png");

    expect(sanitized.ok).toBe(true);
    if (!sanitized.ok) return;
    expect(sanitized.bytes.includes(payload)).toBe(false);
    expect(validateListingPhotoBytes(sanitized.bytes, "image/webp")).toEqual({ ok: true });
    expect(sanitized.primary.format).toBe("webp");
    expect(sanitized.variants.map((variant) => variant.format)).toEqual(["webp", "avif"]);
    expect(Math.max(sanitized.width, sanitized.height)).toBe(maxOptimizedListingPhotoDimension);
  });
});
