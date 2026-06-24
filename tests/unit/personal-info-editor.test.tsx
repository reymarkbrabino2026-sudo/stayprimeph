import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PersonalInfoEditor } from "@/components/account/personal-info-editor";
import type { PersonalInfoState } from "@/lib/account-settings-types";

vi.mock("@/app/account-settings/actions", () => ({
  savePersonalInfoAction: vi.fn(),
}));

const profile: PersonalInfoState = {
  legalName: "",
  preferredName: "",
  email: "host@example.com",
  phone: "",
  identity: "",
  residentialAddress: "",
  mailingAddress: "",
  emergencyContact: "",
};

const user = {
  id: "host-1",
  name: "Host User",
  email: "host@example.com",
  phone: "",
};

afterEach(() => {
  cleanup();
});

describe("PersonalInfoEditor", () => {
  test("guides social sign-in users to set a password before changing email", () => {
    render(<PersonalInfoEditor user={user} initialProfile={profile} hasPassword={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new@example.com" } });

    expect(screen.getByText("Set a StayPrimePH password first.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set StayPrimePH password" })).toHaveAttribute("href", "/forgot-password?email=host%40example.com");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("lets password users reset forgotten passwords during email-change step-up", () => {
    render(<PersonalInfoEditor user={user} initialProfile={profile} hasPassword />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new@example.com" } });

    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password?email=host%40example.com");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "correct-password" } });

    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });
});
