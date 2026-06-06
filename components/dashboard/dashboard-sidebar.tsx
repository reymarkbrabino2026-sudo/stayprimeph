import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function DashboardSidebar({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <aside className="hidden border-r bg-white p-6 lg:block">
      <Link href="/" aria-label="StayPrimePH home" className="inline-flex">
        <BrandLogo className="h-7 w-auto" />
      </Link>
      <nav className="mt-10 space-y-2">
        {links.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block min-h-12 whitespace-nowrap rounded-2xl px-4 py-3 text-sm ${
              index === 0 ? "bg-[#21170f] text-white" : "text-black/65 hover:bg-[#fbf7f2]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
