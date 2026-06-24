"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { updateAvatar } from "@/app/account-settings/avatar-actions";
import { initialsFromName, isRenderableAvatarImage } from "@/lib/avatar";
import { csrfFieldName, csrfHeaderName } from "@/lib/csrf-fields";

export function AvatarUploader({ initialAvatar, name, csrfToken }: { initialAvatar?: string; name: string; csrfToken?: string }) {
  const [avatar, setAvatar] = useState<string | undefined>(isRenderableAvatarImage(initialAvatar) ? initialAvatar : undefined);
  const [failedAvatar, setFailedAvatar] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageSrc = avatar && failedAvatar !== avatar ? avatar : undefined;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const uploadBody = new FormData();
      uploadBody.append("file", file);
      const response = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: uploadBody,
        headers: csrfToken ? { [csrfHeaderName]: csrfToken } : undefined,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed.");

      const saveBody = new FormData();
      saveBody.append("avatarUrl", data.url);
      if (csrfToken) saveBody.append(csrfFieldName, csrfToken);
      const result = await updateAvatar(saveBody);
      if (result.error) throw new Error(result.error);

      setFailedAvatar(undefined);
      setAvatar(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload your photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[#083f35] text-white">
        {imageSrc ? (
          <Image src={imageSrc} alt={name} fill sizes="80px" className="object-cover" onError={() => setFailedAvatar(imageSrc)} />
        ) : (
          <span className="flex size-full items-center justify-center text-xl font-bold">{initialsFromName(name)}</span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-10 items-center rounded-full bg-[#21170f] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Uploading…" : avatar ? "Change photo" : "Upload photo"}
        </button>
        <p className="mt-2 text-xs text-black/45">JPG, PNG, WebP, or AVIF. Square images look best.</p>
        {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
