"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { csrfHeaderName } from "@/lib/csrf-fields";
import { listingPhotoCategoryLabel, type ListingPhotoCategory } from "@/lib/listing-photo-categories";
import type { PropertyImage } from "@/lib/types";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const maxClientUploadBytes = 4 * 1024 * 1024;
const maxPhotos = 20;
const uploadTimeoutMs = 90_000;

type EditablePhoto = {
  id: string;
  url: string;
  name: string;
  category?: ListingPhotoCategory;
};

type UploadResponse = {
  id: string;
  url: string;
  bytes: number;
  category?: ListingPhotoCategory;
};

function toEditablePhoto(photo: PropertyImage, index: number): EditablePhoto {
  return {
    id: photo.id,
    url: photo.imageUrl,
    name: index === 0 ? "Hero photo" : `Photo ${index + 1}`,
    category: photo.category,
  };
}

function isRenderableImage(src: string) {
  return src !== "pending-upload" && (src.startsWith("/") || src.startsWith("https://") || src.startsWith("http://"));
}

function uploadOne(file: File, listingId: string, csrfToken: string | undefined, onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/listing-photo");
    if (csrfToken) xhr.setRequestHeader(csrfHeaderName, csrfToken);
    xhr.timeout = uploadTimeoutMs;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new Error("Unexpected upload response."));
        }
        return;
      }

      let message = `Upload failed (${xhr.status}).`;
      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // Keep the generic response.
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller image."));

    const body = new FormData();
    body.append("file", file);
    body.append("listingId", listingId);
    xhr.send(body);
  });
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function ImageUploader({
  initialPhotos = [],
  listingId,
  csrfToken,
}: {
  initialPhotos?: PropertyImage[];
  listingId?: string;
  csrfToken?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<EditablePhoto[]>(() => initialPhotos.map(toEditablePhoto).filter((photo) => photo.url));
  const [preview, setPreview] = useState<EditablePhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!listingId || !files) return;
    const accepted = Array.from(files).filter((file) => acceptedTypes.includes(file.type));
    if (!accepted.length) {
      setError("Upload JPG, PNG, WebP, or AVIF photos.");
      return;
    }
    if (photos.length + accepted.length > maxPhotos) {
      setError(`You can save up to ${maxPhotos} photos per listing.`);
      return;
    }
    if (accepted.some((file) => file.size > maxClientUploadBytes)) {
      setError("Upload images smaller than 4 MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const fileProgress = accepted.map(() => 0);
      const updateFileProgress = (index: number, percentage: number) => {
        fileProgress[index] = Math.min(100, Math.max(fileProgress[index], Math.round(percentage)));
        setUploadProgress(Math.round(fileProgress.reduce((sum, value) => sum + value, 0) / fileProgress.length));
      };
      const uploaded = await Promise.all(accepted.map(async (file, index) => {
        const result = await uploadOne(file, listingId, csrfToken, (percent) => updateFileProgress(index, percent));
        updateFileProgress(index, 100);
        return { id: result.id, url: result.url, name: file.name, category: result.category };
      }));
      setPhotos((current) => [...current, ...uploaded]);
      setUploadProgress(100);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-[1.5rem] bg-white p-5 soft-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Photos</h3>
          <p className="mt-1 text-sm text-black/55">{photos.length} of {maxPhotos} uploaded</p>
        </div>
        <button
          type="button"
          onClick={() => listingId ? inputRef.current?.click() : window.alert("Save the listing first, then add photos.")}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#21170f] px-4 text-sm font-semibold text-white"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Add photos
        </button>
      </div>

      <div className="grid gap-3">
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => listingId ? inputRef.current?.click() : window.alert("Save the listing first, then add photos.")}
            className="grid min-h-44 place-items-center rounded-[1.25rem] border border-dashed bg-[#fbfaf8] text-sm font-semibold text-black/55"
          >
            Add listing photos
          </button>
        ) : (
          <div className="grid gap-3">
            {photos.map((photo, index) => (
              <article key={`${photo.id}-${photo.url}`} className="grid gap-3 rounded-[1.25rem] border border-black/10 bg-[#fbfaf8] p-3 sm:grid-cols-[112px_1fr]">
                <button type="button" onClick={() => setPreview(photo)} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/[0.04]">
                  {isRenderableImage(photo.url) ? (
                    <Image src={photo.url} alt={photo.name} fill sizes="112px" className="object-cover" unoptimized />
                  ) : (
                    <span className="grid h-full place-items-center text-xs font-semibold text-black/45">No photo</span>
                  )}
                  {index === 0 ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[11px] font-semibold text-white">
                      <Star className="size-3" aria-hidden="true" /> Hero
                    </span>
                  ) : null}
                  <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-black shadow-sm">
                    {listingPhotoCategoryLabel(photo.category)}
                  </span>
                </button>
                <div className="flex min-w-0 flex-col justify-between gap-3">
                  <div>
                    <p className="truncate text-sm font-semibold">{index === 0 ? "Shown first on your listing" : photo.name}</p>
                    <p className="mt-1 text-xs text-black/45">Photo {index + 1}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPhotos((current) => moveItem(current, index, -1))} disabled={index === 0} className="inline-grid size-9 place-items-center rounded-full border border-black/10 disabled:opacity-40" aria-label={`Move ${photo.name} earlier`} title="Move earlier">
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setPhotos((current) => moveItem(current, index, 1))} disabled={index === photos.length - 1} className="inline-grid size-9 place-items-center rounded-full border border-black/10 disabled:opacity-40" aria-label={`Move ${photo.name} later`} title="Move later">
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </button>
                    {index !== 0 ? (
                      <button type="button" onClick={() => setPhotos((current) => [photo, ...current.filter((item) => item !== photo)])} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 px-3 text-xs font-semibold">
                        <Star className="size-3" aria-hidden="true" /> Make hero
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setPhotos((current) => current.filter((item) => item !== photo))} className="inline-grid size-9 place-items-center rounded-full border border-black/10 text-rose-700" aria-label={`Delete ${photo.name}`} title="Delete photo">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {photos.map((photo) => (
        <div key={`photo-url-${photo.id}-${photo.url}`}>
          <input type="hidden" name="photoUrls" value={photo.url} />
          <input type="hidden" name="photoCategories" value={photo.category ?? "other"} />
        </div>
      ))}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />

      {uploading ? (
        <div className="mt-4" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm text-black/60">
            <span>Uploading photos</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/[0.08]" role="progressbar" aria-label="Photo upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}>
            <div className="h-full rounded-full bg-[#083F35] transition-[width] duration-200 ease-out" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}

      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl overflow-hidden rounded-[1.5rem] bg-white">
            <div className="flex justify-end p-3">
              <button type="button" onClick={() => setPreview(null)} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold">Close</button>
            </div>
            <div className="relative aspect-[4/3] bg-black/[0.03]">
              {isRenderableImage(preview.url) ? <Image src={preview.url} alt={preview.name} fill className="object-contain" unoptimized /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
