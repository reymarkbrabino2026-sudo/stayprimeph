import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-white p-6">
      <section className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center soft-card">
        <p className="text-sm font-semibold text-[#083f35]">404</p>
        <h1 className="mt-3 text-2xl font-bold">This stay wandered off</h1>
        <p className="mt-2 text-black/60">
          The page you requested does not exist, or the listing may have been removed.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#21170f] px-5 py-3 font-semibold text-white"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
