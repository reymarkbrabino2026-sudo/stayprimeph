const notAllowedErrorText =
  "Passkey was canceled or timed out. Make sure you are on the same site where you added the passkey, then unlock with your fingerprint, face, screen lock, or security key and try again.";

export function passkeyClientErrorMessage(error: unknown, fallback: string) {
  const name = typeof error === "object" && error && "name" in error ? String((error as { name: unknown }).name) : "";
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (name === "NotAllowedError" || normalizedMessage.includes("timed out") || normalizedMessage.includes("not allowed")) {
    return notAllowedErrorText;
  }

  if (name === "SecurityError" || normalizedMessage.includes("rp id") || normalizedMessage.includes("relying party")) {
    return "Passkeys only work on the exact HTTPS site where they were added. Open StayPrimePH on its main domain, then try again.";
  }

  if (name === "AbortError") {
    return "Passkey was canceled. Try again when you are ready to approve the browser prompt.";
  }

  return message || fallback;
}
