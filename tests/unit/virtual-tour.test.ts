import { describe, expect, it } from "vitest";
import { getVirtualTourEmbed, isValidVirtualTourUrl, normalizeVirtualTourUrl } from "@/lib/virtual-tour";

describe("virtual tour URLs", () => {
  it("normalizes safe http and https URLs", () => {
    expect(normalizeVirtualTourUrl(" https://example.com/tour ")).toBe("https://example.com/tour");
    expect(normalizeVirtualTourUrl("http://example.com/tour")).toBe("http://example.com/tour");
  });

  it("rejects empty, non-http, and malformed URLs", () => {
    expect(normalizeVirtualTourUrl("")).toBeUndefined();
    expect(normalizeVirtualTourUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizeVirtualTourUrl("not a url")).toBeUndefined();
    expect(isValidVirtualTourUrl("not a url")).toBe(false);
  });

  it("builds supported embed URLs", () => {
    expect(getVirtualTourEmbed("https://my.matterport.com/show/?m=abc123")?.embedUrl).toBe("https://my.matterport.com/show/?m=abc123");
    expect(getVirtualTourEmbed("https://youtu.be/dQw4w9WgXcQ")?.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(getVirtualTourEmbed("https://vimeo.com/123456789")?.embedUrl).toBe("https://player.vimeo.com/video/123456789");
    expect(getVirtualTourEmbed("https://kuula.co/share/collection/example")?.providerLabel).toBe("Kuula");
    expect(getVirtualTourEmbed("https://app.cloudpano.com/tours/example")?.providerLabel).toBe("CloudPano");
  });

  it("does not iframe unsupported providers", () => {
    expect(getVirtualTourEmbed("https://example.com/tour")).toBeNull();
  });
});
