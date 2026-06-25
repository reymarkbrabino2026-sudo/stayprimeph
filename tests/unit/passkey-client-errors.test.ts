import { describe, expect, test } from "vitest";
import { passkeyClientErrorMessage } from "@/lib/passkey-client-errors";

describe("passkeyClientErrorMessage", () => {
  test("replaces browser not-allowed passkey errors with an actionable message", () => {
    const error = new DOMException(
      "The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client",
      "NotAllowedError",
    );

    expect(passkeyClientErrorMessage(error, "Passkey sign-in failed.")).toBe(
      "Passkey was canceled or timed out. Make sure you are on the same site where you added the passkey, then unlock with your fingerprint, face, screen lock, or security key and try again.",
    );
  });

  test("keeps server-side passkey errors specific", () => {
    expect(passkeyClientErrorMessage(new Error("No passkey is available for that account."), "Passkey sign-in failed.")).toBe(
      "No passkey is available for that account.",
    );
  });
});
