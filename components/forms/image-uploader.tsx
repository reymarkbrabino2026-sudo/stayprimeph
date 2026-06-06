'use client';

export function ImageUploader() {
  return (
    <button
      type="button"
      onClick={() => window.alert("Image upload will be connected with storage later.")}
      className="grid min-h-40 w-full place-items-center rounded-[1.5rem] border border-dashed bg-white text-sm font-medium text-black/60"
    >
      Upload property images
    </button>
  );
}
