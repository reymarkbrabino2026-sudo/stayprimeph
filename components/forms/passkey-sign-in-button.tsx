"use client";

import { Fingerprint } from "lucide-react";
import { useState, useTransition } from "react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";

type PasskeySignInButtonProps = {
  requestedRole?: "guest" | "host" | "admin";
  nextPath?: string;
};

async function parseJsonResponse<T extends { error?: string }>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({})) as T;
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

function currentEmailValue() {
  if (typeof document === "undefined") return "";
  const input = document.querySelector<HTMLInputElement>('input[name="email"]');
  return input?.value.trim() ?? "";
}

export function PasskeySignInButton({ requestedRole, nextPath }: PasskeySignInButtonProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function signInWithPasskey() {
    setMessage("");
    startTransition(async () => {
      try {
        if (!browserSupportsWebAuthn()) throw new Error("Passkeys are not supported in this browser.");
        const optionsResponse = await fetch("/api/auth/passkeys/authenticate/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentEmailValue(),
            requestedRole,
            nextPath,
          }),
        });
        const optionsJson = await parseJsonResponse<{ options: Parameters<typeof startAuthentication>[0]["optionsJSON"]; error?: string }>(
          optionsResponse,
          "Passkey sign-in could not start.",
        );
        const authentication = await startAuthentication({ optionsJSON: optionsJson.options });
        const verifyResponse = await fetch("/api/auth/passkeys/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: authentication }),
        });
        const verified = await parseJsonResponse<{ ok?: boolean; redirectUrl?: string; error?: string }>(
          verifyResponse,
          "Passkey sign-in could not be verified.",
        );
        if (!verified.redirectUrl) throw new Error("Passkey sign-in did not return a destination.");
        window.location.assign(verified.redirectUrl);
      } catch (error) {
        setMessage(error instanceof Error && error.message ? error.message : "Passkey sign-in failed.");
      }
    });
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={signInWithPasskey}
        disabled={isPending}
        className="grid min-h-12 w-full grid-cols-[auto_1fr_auto] items-center rounded-2xl border border-[#21170f]/15 bg-white px-4 py-3 font-semibold text-[#21170f] shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#21170f]/35 hover:bg-[#faf7f4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:border-[#21170f]/15 disabled:hover:bg-white disabled:hover:shadow-sm"
      >
        <Fingerprint size={18} />
        <span>{isPending ? "Checking passkey" : "Sign in with passkey"}</span>
        <span />
      </button>
      {message ? <p role="alert" className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
    </div>
  );
}
