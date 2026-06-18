"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useHostWizardStore } from "@/stores/host-wizard-store";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxClientUploadBytes = 4 * 1024 * 1024;
const uploadTimeoutMs = 90_000;

interface UploadResponse {
  id: string;
  url: string;
  bytes: number;
}

function uploadOne(file: File, listingId: string, onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/listing-photo");
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

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { draft, addPhotos, removePhoto, setCoverPhoto, movePhoto } = useHostWizardStore();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const preview = draft.photos.find((photo) => photo.id === previewId);

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
        const result = await uploadOne(file, draft.uploadScopeId, (percent) => updateFileProgress(index, percent));
        updateFileProgress(index, 100);
        return { id: result.id, url: result.url, name: file.name, size: result.bytes, isCover: false };
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
          <div className="grid gap-4 sm:grid-cols-2">
            {draft.photos.map((photo, index) => (
              <article key={photo.id} className={`${index === 0 ? "sm:col-span-2" : ""} overflow-hidden rounded-3xl border bg-black/[0.02]`}>
                <button type="button" onClick={() => setPreviewId(photo.id)} className="relative block aspect-[49/29] w-full">
                  <Image src={photo.url} alt={photo.name} fill className="object-cover" unoptimized />
                  {photo.isCover ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">Hero photo</span>
                  ) : null}
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
            ))}
            <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-[49/29] min-h-36 place-items-center rounded-3xl border border-dashed text-lg font-semibold">+ Add more</button>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
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

export function UploadCard() {
  const count = useHostWizardStore((state) => state.draft.photos.length);
  return <div className="rounded-2xl bg-black/[0.03] p-4 text-sm">{count} of 5 minimum photos uploaded</div>;
}
