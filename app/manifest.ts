import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StayPrimePH",
    short_name: "StayPrimePH",
    description: "Vacation rental marketplace for guests, hosts, and admins.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#083f35",
    categories: ["travel", "lifestyle"],
    id: env.NEXT_PUBLIC_APP_URL,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
