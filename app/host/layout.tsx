import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=host");
  if (user.role === "guest") redirect("/become-a-host/upgrade");
  if (user.role !== "host" && user.role !== "admin") redirect("/");
  return children;
}
