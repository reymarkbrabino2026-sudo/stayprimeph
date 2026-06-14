"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MessageAutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }

    const timer = window.setInterval(refreshWhenVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [intervalMs, router]);

  return null;
}
