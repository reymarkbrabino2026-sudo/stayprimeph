"use client";

import { signOutAllDevices } from "@/app/auth/actions";
import { clearClientSessionState } from "@/components/auth/logout-button";

export function LogoutAllDevicesButton() {
  return (
    <form action={signOutAllDevices} onSubmit={clearClientSessionState}>
      <button className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50">
        Log out all devices
      </button>
    </form>
  );
}
