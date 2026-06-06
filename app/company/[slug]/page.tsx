import { notFound } from "next/navigation";
import { FooterPage } from "@/components/home/footer-page";
import { SiteFooter } from "@/components/home/site-footer";
import { Navbar } from "@/components/public/navbar";
import { footerPages } from "@/lib/home-data";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = footerPages.company[slug];
  if (!page) notFound();

  return (
    <>
      <Navbar />
      <FooterPage page={page} />
      <SiteFooter />
    </>
  );
}
