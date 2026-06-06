import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WishlistGrid } from "@/components/wishlist/wishlist-grid";
import { getCurrentUser } from "@/lib/auth";
import { guestLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";

export default async function GuestWishlistPage() {
  await getCurrentUser();
  const properties = await getProperties();

  return (
    <DashboardShell title="Wishlist" subtitle="Guest dashboard" description="Homes you saved for later." links={guestLinks}>
      <WishlistGrid properties={properties} />
    </DashboardShell>
  );
}
