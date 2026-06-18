import { requireRole } from "@/lib/auth";
import { PendingWishlistSync } from "@/components/wishlist/wishlist-button";

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  await requireRole("guest", { redirectTo: "/login", forbiddenRedirectTo: "/" });
  return (
    <>
      <PendingWishlistSync />
      {children}
    </>
  );
}
