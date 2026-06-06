'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-white p-6">
          <section className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center soft-card">
            <p className="text-sm font-semibold text-[#083f35]">StayPrimePH</p>
            <h1 className="mt-3 text-2xl font-bold">We hit a rough patch</h1>
            <p className="mt-2 text-black/60">
              The page could not recover cleanly. Try again, and if it keeps happening we will have the error report.
            </p>
            <button
              onClick={() => reset()}
              className="mt-5 min-h-11 rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
