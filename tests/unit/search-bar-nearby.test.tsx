import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SearchBar } from "@/components/public/search-bar";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push }),
  useSearchParams: () => navigationMock.searchParams,
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imageProps = { ...props };
    delete imageProps.preload;
    delete imageProps.priority;
    return React.createElement("img", imageProps);
  },
}));

function openMobileSearch() {
  fireEvent.click(screen.getByRole("button", { name: /start your search/i }));
}

function clickNearbySuggestion() {
  const nearbyButton = screen.getByText("Nearby").closest("button");
  expect(nearbyButton).not.toBeNull();
  fireEvent.click(nearbyButton!);
}

function mockGeolocation(
  getCurrentPosition: (
    success: PositionCallback,
    error: PositionErrorCallback | null | undefined,
  ) => void,
) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(getCurrentPosition),
    },
  });
}

beforeEach(() => {
  navigationMock.push.mockReset();
  navigationMock.searchParams = new URLSearchParams();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SearchBar Nearby", () => {
  test("waits for geolocation before routing mobile Nearby searches", async () => {
    let resolvePosition: PositionCallback | null = null;
    mockGeolocation((success) => {
      resolvePosition = success;
    });

    render(<SearchBar variant="mobile" />);
    openMobileSearch();

    clickNearbySuggestion();

    expect(screen.getByRole("status")).toHaveTextContent("Getting your current location");
    expect(navigationMock.push).not.toHaveBeenCalled();

    await act(async () => {
      resolvePosition?.({
        coords: { latitude: 14.5995, longitude: 120.9842 },
      } as GeolocationPosition);
    });

    await screen.findByRole("heading", { name: "When?" });

    fireEvent.click(screen.getByRole("button", { name: "Continue search" }));
    fireEvent.click(screen.getByRole("button", { name: "Search selected stays" }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith("/search?location=Nearby&near=14.59950%2C120.98420");
    });
  });

  test("keeps mobile users on the search sheet when location permission is denied", async () => {
    mockGeolocation((_success, error) => {
      error?.({ code: 1 } as GeolocationPositionError);
    });

    render(<SearchBar variant="mobile" />);
    openMobileSearch();

    clickNearbySuggestion();

    expect(await screen.findByRole("alert")).toHaveTextContent("Location permission is blocked");
    expect(screen.getByRole("heading", { name: "Where?" })).toBeInTheDocument();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });
});
