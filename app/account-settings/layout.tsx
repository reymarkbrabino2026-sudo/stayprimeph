import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";

export default async function AccountSettingsLayout({ children }: { children: ReactNode }) {
  await requireUser({ redirectTo: "/login" });
  return children;
}
