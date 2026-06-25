"use client";

import Link from "next/link";
import { Bell, Check, Clock3, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type ActivityNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  category: "booking" | "message" | "payment" | "listing" | "support" | "security" | "activity";
};

type NotificationsResponse = {
  userId: string | null;
  role: UserRole | null;
  notifications: ActivityNotification[];
};

type NotificationBellProps = {
  variant?: "light" | "dark" | "panel";
  eager?: boolean;
};

function notificationsHref(role: UserRole | null) {
  if (role === "admin") return "/admin/notifications";
  if (role === "host") return "/host/notifications";
  return "/guest/notifications";
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function readStoredIds(key: string) {
  if (typeof window === "undefined") return new Set<string>();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

export function NotificationBell({ variant = "dark", eager = true }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [requested, setRequested] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  const storageKey = userId ? `stayprimeph:notification-read:${userId}` : null;

  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    setRequested(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", signal });
      if (signal?.aborted) return;
      if (!response.ok) {
        setLoaded(true);
        return;
      }
      const data = (await response.json()) as NotificationsResponse;
      if (signal?.aborted) return;
      setUserId(data.userId);
      setRole(data.role);
      setNotifications(data.notifications);
      if (data.userId) setReadIds(readStoredIds(`stayprimeph:notification-read:${data.userId}`));
      setLoaded(true);
    } catch {
      if (!signal?.aborted) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!eager) return;

    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => {
      void loadNotifications(controller.signal);
    }, 0);
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60000);
    return () => {
      window.clearTimeout(initialLoad);
      controller.abort();
      window.clearInterval(interval);
    };
  }, [eager, loadNotifications]);

  useEffect(() => {
    if (!open || requested) return;
    const initialLoad = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadNotifications, open, requested]);

  useEffect(() => {
    if (!open || !loaded) return;
    if (eager) return;

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60000);
    return () => {
      window.clearInterval(interval);
    };
  }, [eager, loadNotifications, loaded, open]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !readIds.has(notification.id)).length,
    [notifications, readIds],
  );

  function markAllRead() {
    if (!storageKey) return;
    const nextIds = new Set(notifications.map((notification) => notification.id));
    setReadIds(nextIds);
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(nextIds).slice(0, 100)));
  }

  if (requested && loaded && !userId) return null;

  const buttonClassName = cn(
    "relative grid size-10 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    variant === "light" && "bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/60 focus-visible:ring-offset-transparent",
    variant === "dark" && "bg-[#e8f4ef] text-[#083f35] hover:bg-[#dcefe8] focus-visible:ring-[#083f35]/30 focus-visible:ring-offset-white",
    variant === "panel" && "border border-black/10 bg-white text-[#083f35] shadow-sm hover:bg-[#fbf7f2] focus-visible:ring-[#083f35]/25 focus-visible:ring-offset-[#f8f3ed]",
  );

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={buttonClassName}
        aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
        aria-expanded={open}
      >
        {requested && !loaded ? <LoaderCircle size={18} className="animate-spin" /> : <Bell size={19} />}
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-[590] cursor-default bg-transparent" />
          <div className="fixed left-3 right-3 top-[4.75rem] mx-auto max-w-[24rem] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:mx-0 sm:w-[min(23rem,calc(100vw-2rem))] sm:max-w-none z-[600] overflow-hidden rounded-3xl bg-white text-black shadow-[0_18px_60px_rgb(0_0_0_/_0.18)] ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
              <div>
                <p className="text-sm font-bold">Notifications</p>
                <p className="text-xs text-black/50">{unreadCount ? `${unreadCount} new update${unreadCount === 1 ? "" : "s"}` : "All caught up"}</p>
              </div>
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#083f35] transition hover:bg-[#e8f4ef]"
              >
                <Check size={14} />
                Read
              </button>
            </div>

            <div data-lenis-prevent className="max-h-[min(26rem,70vh)] overflow-y-auto p-2">
              {requested && !loaded ? (
                <div className="flex items-center gap-2 p-5 text-sm text-black/55">
                  <LoaderCircle size={16} className="animate-spin" />
                  Loading activity...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-5 text-sm text-black/55">No activity yet. New bookings, messages, payments, and listing updates will appear here.</div>
              ) : (
                notifications.slice(0, 6).map((notification) => {
                  const unread = !readIds.has(notification.id);
                  return (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 rounded-2xl px-3 py-3 transition hover:bg-black/[0.04]"
                    >
                      <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", unread ? "bg-[#f97316]" : "bg-black/15")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-5">{notification.title}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-black/55">{notification.body}</span>
                        <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-black/40">
                          <Clock3 size={12} />
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            <Link
              href={notificationsHref(role)}
              onClick={() => setOpen(false)}
              className="block border-t border-black/10 px-4 py-3 text-center text-sm font-semibold text-[#083f35] transition hover:bg-[#e8f4ef]"
            >
              View all notifications
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
