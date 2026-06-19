import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { maxOptimizedListingPhotoDimension, maxListingPhotoUploadBytes, sanitizeListingPhotoImage, validateListingPhotoBytes, validateListingPhotoMetadata } from "@/lib/listing-photo-upload-validation";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpgSignature = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const webpSignature = Buffer.from("RIFFxxxxWEBP", "ascii");

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

    expect(validateListingPhotoBytes(jpgSignature, "image/jpeg")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(pngSignature, "image/png")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(webpSignature, "image/webp")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(avif, "image/avif")).toEqual({ ok: true });
    expect(validateListingPhotoBytes(Buffer.from("not an image"), "image/png")).toMatchObject({ ok: false, status: 400 });
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
