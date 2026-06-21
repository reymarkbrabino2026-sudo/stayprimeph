// Full-screen branded loader: the StayPrimePH mark breathing inside a spinning
// progress ring on the deep-green brand background. Pure CSS, so it animates
// even as a server-rendered Suspense fallback (no client JS required).
export function BrandLoader({ label = "Loading your stays…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[200] grid place-items-center bg-[#08382f]"
    >
      <span className="sr-only">Loading…</span>

      <div className="relative grid size-28 place-items-center">
        {/* Spinning progress ring */}
        <svg
          className="absolute inset-0 size-full animate-spin [animation-duration:1.1s]"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="70 220"
          />
        </svg>

        {/* Breathing logo mark */}
        <svg
          className="size-14 [animation:loaderBreathe_1.6s_ease-in-out_infinite]"
          viewBox="930 510 60 60"
          fill="#fff"
          aria-hidden="true"
        >
          <path d="M959.57,513.1h-26.47v26.47c0,15.07,12.26,27.33,27.33,27.33h26.47v-26.47c0-15.07-12.26-27.33-27.33-27.33ZM968.8,541.97h-.02v19.14h-8.35c-6.04,0-11.5-2.5-15.41-6.52h14.29c1.66-.12,2.97-1.5,2.97-3.19v-10.84h0v-.05c0-1.88-1.53-3.41-3.41-3.41h-4.72c-1.63,0-2.95-1.32-2.95-2.95s1.32-2.95,2.95-2.95h5.42c5.09,0,9.23,4.13,9.23,9.23v1.54ZM981.11,561.11h-6.52v-20.68c0-8.29-6.72-15.02-15.02-15.02h-10.94c-1.78,0-3.22,1.44-3.22,3.22h0s0,10.98,0,10.98c0,1.82,1.48,3.29,3.3,3.29h7.78v5.9h-8.35c-5.07,0-9.23-4.15-9.25-9.23v-20.68h20.68c11.89,0,21.54,9.64,21.54,21.54v20.68Z" />
        </svg>
      </div>

      <p className="absolute bottom-[32%] text-sm font-medium tracking-wide text-white/70">{label}</p>
    </div>
  );
}
