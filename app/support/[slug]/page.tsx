import { notFound } from "next/navigation";
import { FooterPage } from "@/components/home/footer-page";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { HelpCenterPage } from "@/components/support/help-center-page";
import { UserGuidePage } from "@/components/support/user-guide-page";
import { footerPages } from "@/lib/home-data";

export default async function SupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const page = footerPages.support[slug];
  if (!page) notFound();

  return (
    <>
      <Navbar />
      {slug === "help-center" ? (
        <HelpCenterPage searchParams={query} />
      ) : slug === "user-guide" ? (
        <UserGuidePage />
      ) : (
        <FooterPage page={page} />
      )}
      <SiteFooter />
    </>
  );
}
