import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

export function hasCloudinaryConfig() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function getCloudinarySignature() {
  if (!hasCloudinaryConfig()) return null;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "stayprimeph/listings";
  return {
    timestamp,
    folder,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    signature: cloudinary.utils.api_sign_request({ timestamp, folder }, env.CLOUDINARY_API_SECRET!),
  };
}
