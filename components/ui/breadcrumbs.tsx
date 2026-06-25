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
    <nav aria-label="Breadcrumb" className={`min-w-0 max-w-full ${className}`}>
      <ol className={`flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-hidden text-sm sm:flex-wrap ${listColor}`}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const labelClass = isLast
            ? "block max-w-[11rem] truncate min-[390px]:max-w-[13rem] sm:max-w-none"
            : "block max-w-[6.5rem] truncate min-[390px]:max-w-[7.5rem] sm:max-w-none";
          return (
            <li key={`${item.label}-${index}`} className={`flex min-w-0 items-center gap-1.5 ${isLast ? "flex-1" : "shrink-0"}`}>
              {item.href && !isLast ? (
                <Link href={item.href} title={item.label} className={`${labelClass} ${linkColor}`}>
                  {item.label}
                </Link>
              ) : (
                <span
                  title={item.label}
                  className={`${labelClass} ${isLast ? lastColor : ""}`}
                  aria-current={isLast ? "page" : undefined}
                >
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
