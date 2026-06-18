import { requireRole } from "@/lib/auth";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["host", "admin"], {
    redirectTo: "/login?role=host",
    roleRedirects: { guest: "/become-a-host/upgrade" },
    forbiddenRedirectTo: "/",
  });
  return children;
}
