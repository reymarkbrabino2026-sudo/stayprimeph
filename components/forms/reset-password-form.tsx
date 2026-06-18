"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/forms/password-input";
import { evaluatePasswordRules, passwordRulesPass } from "@/lib/password-policy";

type ResetPasswordFormProps = {
  action: (formData: FormData) => Promise<void>;
  emailError?: string;
};

const inputClass = "min-h-12 w-full rounded-2xl border border-black/10 bg-white p-4 text-base outline-none transition focus:border-[#21170f]/45 focus:ring-2 focus:ring-[#21170f]/10";
const errorInputClass = "border-rose-300 bg-rose-50/50 focus:border-rose-400 focus:ring-rose-100";

function Requirement({ met, children }: { met: boolean; children: ReactNode }) {
  const Icon = met ? Check : X;

  return (
    <li className={["flex items-center gap-2 text-sm", met ? "text-emerald-700" : "text-black/55"].join(" ")}>
      <span className={["grid size-5 shrink-0 place-items-center rounded-full", met ? "bg-emerald-50" : "bg-black/[0.04]"].join(" ")}>
        <Icon aria-hidden="true" size={14} strokeWidth={2.4} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const className = [
    "mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#352417] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm disabled:hover:translate-y-0 disabled:hover:shadow-sm",
    pending ? "cursor-wait bg-[#21170f]" : "bg-[#21170f]",
    disabled && !pending ? "cursor-not-allowed bg-[#21170f]/40 hover:bg-[#21170f]/40" : "",
  ].join(" ");

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <>
          <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
          <span>Saving...</span>
        </>
      ) : (
        "Save password"
      )}
    </button>
  );
}

export function ResetPasswordForm({ action, emailError }: ResetPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [editedEmailAfterError, setEditedEmailAfterError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const rules = useMemo(() => evaluatePasswordRules(password), [password]);
  const activeEmailError = editedEmailAfterError ? undefined : emailError;
  const hasEmail = email.trim().includes("@");
  const strongEnough = passwordRulesPass(rules);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const showMismatch = confirmTouched && confirmPassword.length > 0 && !passwordsMatch;
  const disabled = !hasEmail || !strongEnough || !passwordsMatch;

  return (
    <form action={action} className="mt-5 space-y-3">
      <label htmlFor="account-email" className="sr-only">Confirm account email</label>
      <input
        id="account-email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (emailError) setEditedEmailAfterError(true);
        }}
        autoComplete="email"
        required
        placeholder="Confirm account email"
        className={[inputClass, activeEmailError ? errorInputClass : ""].join(" ")}
        aria-invalid={Boolean(activeEmailError)}
        aria-describedby={activeEmailError ? "account-email-error" : undefined}
      />
      {activeEmailError ? (
        <p id="account-email-error" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700" aria-live="polite">
          {activeEmailError}
        </p>
      ) : null}

      <label htmlFor="new-password" className="sr-only">New password</label>
      <PasswordInput
        id="new-password"
        name="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={12}
        autoComplete="new-password"
        required
        placeholder="New password"
        className={inputClass}
        aria-describedby="password-requirements"
      />

      <div id="password-requirements" className="rounded-2xl bg-[#faf7f4] p-4">
        <ul className="grid gap-2">
          <Requirement met={rules.minLength}>At least 12 characters</Requirement>
          <Requirement met={rules.uppercase}>One uppercase letter</Requirement>
          <Requirement met={rules.lowercase}>One lowercase letter</Requirement>
          <Requirement met={rules.number}>One number</Requirement>
          <Requirement met={rules.special}>One special character</Requirement>
          <Requirement met={rules.notCommon}>Not a common weak password</Requirement>
        </ul>
      </div>

      <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
      <PasswordInput
        id="confirm-password"
        name="confirmPassword"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        onBlur={() => setConfirmTouched(true)}
        minLength={12}
        autoComplete="new-password"
        required
        placeholder="Confirm new password"
        className={inputClass}
        aria-invalid={showMismatch}
        aria-describedby={showMismatch ? "password-match-error" : undefined}
      />
      {showMismatch ? (
        <p id="password-match-error" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700" aria-live="polite">
          Passwords do not match.
        </p>
      ) : null}

      <SubmitButton disabled={disabled} />
    </form>
  );
}
