"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={[className, "pr-12"].filter(Boolean).join(" ")}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-black/45 transition hover:bg-black/[0.06] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21170f]"
      >
        <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}
