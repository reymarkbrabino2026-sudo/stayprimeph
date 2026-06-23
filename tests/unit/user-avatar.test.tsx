import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { UserAvatar } from "@/components/ui/user-avatar";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    onError,
  }: {
    src: string;
    alt: string;
    className?: string;
    onError?: () => void;
  }) => <img src={src} alt={alt} className={className} onError={onError} />,
}));

afterEach(() => {
  cleanup();
});

describe("UserAvatar", () => {
  test("renders upload URLs as images instead of visible text", () => {
    const avatarUrl = "https://stayprimeph.public.blob.vercel-storage.com/uploads/avatars/user-1/photo.webp";

    render(<UserAvatar avatar={avatarUrl} name="James Prime" />);

    expect(screen.getByAltText("James Prime")).toHaveAttribute("src", avatarUrl);
    expect(screen.queryByText(avatarUrl)).not.toBeInTheDocument();
  });

  test("falls back to initials when an uploaded avatar image fails", () => {
    const avatarUrl = "https://stayprimeph.public.blob.vercel-storage.com/uploads/avatars/user-1/photo.webp";

    render(<UserAvatar avatar={avatarUrl} name="James Prime" />);
    fireEvent.error(screen.getByAltText("James Prime"));

    expect(screen.getByText("JP")).toBeInTheDocument();
    expect(screen.queryByText(avatarUrl)).not.toBeInTheDocument();
  });
});
