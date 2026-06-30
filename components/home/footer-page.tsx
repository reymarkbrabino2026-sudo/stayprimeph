import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { FooterPage as FooterPageContent } from "@/lib/home-data";

export function FooterPage({ page }: { page: FooterPageContent }) {
  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <p className="text-sm font-medium text-rose-600">{page.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">{page.intro}</p>

      <div className="mt-10 space-y-4">
        {page.sections.map((section) => (
          <section key={section.title} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 leading-7 text-black/65">{section.body}</p>
            {section.items ? (
              <ul className="mt-5 grid gap-3 text-sm font-medium text-black/75">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#083f35]" aria-hidden="true" />
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {page.cta && (
        <Link
          href={page.cta.href}
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition hover:bg-black/85"
        >
          {page.cta.label}
        </Link>
      )}
    </main>
  );
}
