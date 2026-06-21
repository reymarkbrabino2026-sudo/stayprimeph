import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({
  items,
  className = "",
  tone = "dark",
}: {
  items: Crumb[];
  className?: string;
  tone?: "dark" | "light";
}) {
  if (items.length === 0) return null;

  const isLight = tone === "light";
  const listColor = isLight ? "text-white/75" : "text-black/55";
  const lastColor = isLight ? "font-semibold text-white" : "font-semibold text-black/80";
  const linkColor = isLight ? "transition hover:text-white hover:underline" : "transition hover:text-black/80 hover:underline";
  const separatorColor = isLight ? "shrink-0 text-white/50" : "shrink-0 text-black/35";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={`flex flex-wrap items-center gap-1.5 text-sm ${listColor}`}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className={linkColor}>
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? lastColor : undefined} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight size={14} className={separatorColor} aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
