'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md rounded-[1.5rem] bg-white p-6 text-center soft-card">
        <h1 className="text-2xl font-bold">Something went sideways</h1>
        <p className="mt-2 text-black/60">The interface is intact, but this section could not load.</p>
        <button onClick={() => reset()} className="mt-5 rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
