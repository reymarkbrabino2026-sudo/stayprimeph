"use client";

import { Fingerprint, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { csrfHeaderName } from "@/lib/csrf-fields";

type PublicPasskey = {
  id: string;
  name: string;
  transports?: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

type PasskeyResponse = {
  passkeys?: PublicPasskey[];
  error?: string;
};

function formatDate(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function parseJsonResponse<T extends { error?: string }>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({})) as T;
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

export function PasskeySettings({
  initialPasskeys,
  csrfToken,
  canAddPasskey,
}: {
  initialPasskeys: PublicPasskey[];
  csrfToken: string;
  canAddPasskey: boolean;
}) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function savePasskeys(next: PublicPasskey[]) {
    setPasskeys(next);
    setName("");
  }

  function addPasskey() {
    setMessage("");
    startTransition(async () => {
      try {
        if (!browserSupportsWebAuthn()) throw new Error("Passkeys are not supported in this browser.");
        const optionsResponse = await fetch("/api/auth/passkeys/register/options", {
          method: "POST",
          headers: { [csrfHeaderName]: csrfToken },
        });
        const optionsJson = await parseJsonResponse<{ options: Parameters<typeof startRegistration>[0]["optionsJSON"]; error?: string }>(
          optionsResponse,
          "Passkey setup could not start.",
        );
        const registration = await startRegistration({ optionsJSON: optionsJson.options });
        const verifyResponse = await fetch("/api/auth/passkeys/register/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [csrfHeaderName]: csrfToken,
          },
          body: JSON.stringify({ response: registration, name }),
        });
        const verified = await parseJsonResponse<PasskeyResponse>(verifyResponse, "Passkey setup could not be verified.");
        if (verified.passkeys) savePasskeys(verified.passkeys);
        setMessage("Passkey added.");
      } catch (error) {
        setMessage(error instanceof Error && error.message ? error.message : "Passkey setup failed.");
      }
    });
  }

  function removePasskey(id: string) {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/passkeys/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [csrfHeaderName]: csrfToken,
          },
          body: JSON.stringify({ id }),
        });
        const data = await parseJsonResponse<PasskeyResponse>(response, "Passkey could not be removed.");
        if (data.passkeys) savePasskeys(data.passkeys);
        setMessage("Passkey removed.");
      } catch (error) {
        setMessage(error instanceof Error && error.message ? error.message : "Passkey could not be removed.");
      }
    });
  }

  return (
    <div className="border-b border-black/10 py-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Passkeys</h3>
          <p className="mt-1 text-sm text-black/65">Use fingerprint, face, screen lock, or a security key to sign in.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-72">
          <label className="sr-only" htmlFor="passkey-name">Passkey name</label>
          <input
            id="passkey-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Passkey name"
            className="min-h-11 rounded-xl border border-black/15 px-4 text-sm outline-none focus:border-[#083f35]"
            disabled={isPending || !canAddPasskey}
          />
          <button
            type="button"
            onClick={addPasskey}
            disabled={isPending || !canAddPasskey}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#222] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/25"
          >
            <Fingerprint size={17} />
            {isPending ? "Working..." : "Add passkey"}
          </button>
        </div>
      </div>

      {!canAddPasskey ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-900">Verify your email before adding a passkey.</p> : null}
      {message ? <p className="mt-4 rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-black/70">{message}</p> : null}

      <div className="mt-5 divide-y divide-black/10">
        {passkeys.length > 0 ? passkeys.map((passkey) => (
          <div key={passkey.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/[0.04]">
                <Fingerprint size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{passkey.name}</p>
                <p className="mt-1 text-xs text-black/55">Added {formatDate(passkey.createdAt)} - Last used {formatDate(passkey.lastUsedAt)}</p>
                <p className="mt-1 text-xs text-black/55">{passkey.deviceType === "multiDevice" ? "Synced passkey" : "Device-bound passkey"}{passkey.backedUp ? " - Backed up" : ""}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removePasskey(passkey.id)}
              disabled={isPending}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-black/15 text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Remove ${passkey.name}`}
            >
              <Trash2 size={17} />
            </button>
          </div>
        )) : (
          <p className="rounded-xl bg-black/[0.02] p-4 text-sm text-black/65">No passkeys added yet.</p>
        )}
      </div>
    </div>
  );
}
