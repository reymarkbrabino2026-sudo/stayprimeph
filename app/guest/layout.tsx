import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PendingWishlistSync } from "@/components/wishlist/wishlist-button";

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "guest") redirect("/");
  return (
    <>
      <PendingWishlistSync />
      {children}
    </>
  );
}
