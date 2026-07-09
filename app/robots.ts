import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/guest/",
        "/host/",
        "/account-settings/",
        "/api/",
        "/auth/",
        "/bookings/",
        "/forgot-password",
        "/login",
        "/register",
        "/reset-password/",
        "/verify-email/",
        "/account-deletion/",
      ],
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
