"use client";

import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { csrfHeaderName } from "@/lib/csrf-fields";
import { listingPhotoCategoryLabel, listingPhotoCategoryRank, normalizeListingPhotoCategory, type ListingPhotoCategory } from "@/lib/listing-photo-categories";
import { useHostWizardStore } from "@/stores/host-wizard-store";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const maxClientUploadBytes = 4 * 1024 * 1024;
const maxRoomPhotos = 12;
const uploadTimeoutMs = 90_000;

interface UploadResponse {
  id: string;
  url: string;
  bytes: number;
  category?: ListingPhotoCategory;
}

type RoomPhotoChange = string[] | ((currentPhotos: string[]) => string[]);

function groupPhotosByCategory<T extends { category?: ListingPhotoCategory }>(photos: T[]) {
  const groups = new Map<ListingPhotoCategory, T[]>();

  for (const photo of photos) {
    const category = normalizeListingPhotoCategory(photo.category);
    groups.set(category, [...(groups.get(category) ?? []), photo]);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => listingPhotoCategoryRank(left) - listingPhotoCategoryRank(right))
    .map(([category, items]) => ({ category, photos: items }));
}

function uploadOne(file: File, listingId: string, csrfToken: string, onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/listing-photo");
    xhr.setRequestHeader(csrfHeaderName, csrfToken);
    xhr.timeout = uploadTimeoutMs;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new Error("Unexpected upload response."));
        }
      } else {
        let message = `Upload failed (${xhr.status}).`;
        try {
          const payload = JSON.parse(xhr.responseText) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Non-JSON body — keep generic message.
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller image."));
    const body = new FormData();
    body.append("file", file);
    body.append("listingId", listingId);
    xhr.send(body);
  });
}

function isRenderableImage(src: string) {
  return src.startsWith("/") || src.startsWith("https://") || src.startsWith("http://");
}

export function ImageUploader({ csrfToken }: { csrfToken: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { draft, addPhotos, removePhoto, setCoverPhoto, movePhoto } = useHostWizardStore();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const preview = draft.photos.find((photo) => photo.id === previewId);
  const photoGroups = groupPhotosByCategory(draft.photos);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((file) => acceptedTypes.includes(file.type));
    if (!accepted.length) return;
    const oversized = accepted.find((file) => file.size > maxClientUploadBytes);
    if (oversized) {
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
        const totalProgress = fileProgress.reduce((sum, value) => sum + value, 0) / fileProgress.length;
        setUploadProgress(Math.round(totalProgress));
      };

      const uploaded = await Promise.all(accepted.map(async (file, index) => {
        const result = await uploadOne(file, draft.uploadScopeId, csrfToken, (percent) => updateFileProgress(index, percent));
        updateFileProgress(index, 100);
        return { id: result.id, url: result.url, name: file.name, size: result.bytes, isCover: false, category: result.category };
      }));
      setUploadProgress(100);
      addPhotos(uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {draft.photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[22rem] w-full flex-col items-center justify-center rounded-3xl border border-dashed bg-black/[0.01] p-6 text-center"
        >
          <span aria-hidden="true" className="text-5xl">📷</span>
          <span className="mt-5 rounded-xl bg-black/[0.04] px-4 py-3 font-semibold">Add photos</span>
        </button>
      ) : (
        <div>
          <p className="mb-4 rounded-2xl bg-black/[0.03] px-4 py-3 text-sm text-black/60">
            Photos appear in a full-width <strong className="font-semibold text-black/75">980 × 580</strong> carousel on your listing page. Use landscape shots and set your best one as the hero.
          </p>
          <div className="space-y-5">
            {photoGroups.map((group) => (
              <section key={group.category}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{listingPhotoCategoryLabel(group.category)}</h3>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-black/55">
                    {group.photos.length} photo{group.photos.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.photos.map((photo) => {
                    const index = draft.photos.findIndex((item) => item.id === photo.id);

                    return (
                      <article key={photo.id} className={`${index === 0 ? "sm:col-span-2" : ""} overflow-hidden rounded-3xl border bg-black/[0.02]`}>
                        <button type="button" onClick={() => setPreviewId(photo.id)} className="relative block aspect-[49/29] w-full">
                          <Image src={photo.url} alt={photo.name} fill className="object-cover" unoptimized />
                          {photo.isCover ? (
                            <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">Hero photo</span>
                          ) : null}
                          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black shadow-sm">
                            {listingPhotoCategoryLabel(photo.category)}
                          </span>
                        </button>
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                          <span className="truncate">{photo.isCover ? "Shown first" : photo.name}</span>
                          <div className="flex gap-2">
                            {!photo.isCover ? <button type="button" onClick={() => setCoverPhoto(photo.id)} className="rounded-full border px-3 py-1">Set as hero</button> : null}
                            <button type="button" aria-label={`Move ${photo.name} earlier`} onClick={() => movePhoto(photo.id, -1)} className="rounded-full border px-3 py-1">↑</button>
                            <button type="button" aria-label={`Move ${photo.name} later`} onClick={() => movePhoto(photo.id, 1)} className="rounded-full border px-3 py-1">↓</button>
                            <button type="button" onClick={() => removePhoto(photo.id)} className="rounded-full border px-3 py-1">Delete</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-[49/29] min-h-36 w-full place-items-center rounded-3xl border border-dashed text-lg font-semibold">+ Add more</button>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
      {uploading ? (
        <div className="mt-3" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm text-black/60">
            <span>Uploading photos...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-black/[0.08]"
            role="progressbar"
            aria-label="Photo upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress}
          >
            <div className="h-full rounded-full bg-[#083F35] transition-[width] duration-200 ease-out" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white">
            <div className="flex justify-end p-3"><button onClick={() => setPreviewId(null)} className="rounded-full border px-3 py-1">Close</button></div>
            <div className="relative aspect-[1.5/1]"><Image src={preview.url} alt={preview.name} fill className="object-contain" unoptimized /></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RoomPhotoUploader({
  photos,
  roomName,
  csrfToken,
  onChange,
}: {
  photos: string[];
  roomName: string;
  csrfToken: string;
  onChange: (photos: RoomPhotoChange) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latestPhotosRef = useRef(photos);
  const uploadScopeId = useHostWizardStore((state) => state.draft.uploadScopeId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    latestPhotosRef.current = photos;
  }, [photos]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;

    const accepted = Array.from(files).filter((file) => acceptedTypes.includes(file.type));
    if (!accepted.length) {
      setError("Upload JPG, PNG, WebP, or AVIF room photos.");
      return;
    }
    if (latestPhotosRef.current.length + accepted.length > maxRoomPhotos) {
      setError(`You can add up to ${maxRoomPhotos} photos per room.`);
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
        const result = await uploadOne(file, uploadScopeId, csrfToken, (percent) => updateFileProgress(index, percent));
        updateFileProgress(index, 100);
        return result.url;
      }));
      setUploadProgress(100);
      onChange((currentPhotos) => [...currentPhotos, ...uploaded].slice(0, maxRoomPhotos));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.015] p-3">
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-white text-center text-sm font-semibold text-black/55 transition hover:border-black/30 hover:text-black"
        >
          <ImagePlus className="mb-2 size-6" aria-hidden="true" />
          Add room photos
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <article key={`${photo}-${index}`} className="overflow-hidden rounded-xl border border-black/10 bg-white">
              <button type="button" onClick={() => setPreviewUrl(photo)} className="relative block aspect-[4/3] w-full bg-black/[0.04]">
                {isRenderableImage(photo) ? (
                  <Image src={photo} alt={`${roomName || "Room"} photo ${index + 1}`} fill className="object-cover" unoptimized />
                ) : (
                  <span className="grid h-full place-items-center text-xs font-semibold text-black/45">Photo unavailable</span>
                )}
              </button>
              <div className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className="truncate text-black/60">Photo {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange((currentPhotos) => currentPhotos.filter((_, photoIndex) => photoIndex !== index))}
                  className="grid size-8 place-items-center rounded-full text-rose-700 transition hover:bg-rose-50"
                  aria-label={`Remove room photo ${index + 1}`}
                  title="Remove photo"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
          {photos.length < maxRoomPhotos ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid min-h-28 place-items-center rounded-xl border border-dashed border-black/15 bg-white text-sm font-semibold text-black/55 transition hover:border-black/30 hover:text-black"
            >
              <span className="inline-flex items-center gap-2">
                <ImagePlus className="size-4" aria-hidden="true" />
                Add more
              </span>
            </button>
          ) : null}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
      {uploading ? (
        <div className="mt-3" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm text-black/60">
            <span>Uploading room photos...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-black/[0.08]"
            role="progressbar"
            aria-label="Room photo upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress}
          >
            <div className="h-full rounded-full bg-[#083F35] transition-[width] duration-200 ease-out" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}

      {previewUrl ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white">
            <div className="flex justify-end p-3">
              <button type="button" onClick={() => setPreviewUrl(null)} className="rounded-full border px-3 py-1 text-sm font-semibold">Close</button>
            </div>
            <div className="relative aspect-[1.5/1] bg-black/[0.03]">
              {isRenderableImage(previewUrl) ? <Image src={previewUrl} alt={`${roomName || "Room"} photo preview`} fill className="object-contain" unoptimized /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UploadCard() {
  const count = useHostWizardStore((state) => state.draft.photos.length);
  return <div className="rounded-2xl bg-black/[0.03] p-4 text-sm">{count} of 5 minimum photos uploaded</div>;
}
