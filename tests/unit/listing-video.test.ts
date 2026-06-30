import { describe, expect, it } from "vitest";
import { getListingVideoEmbed, isValidListingVideoUrl, normalizeListingVideoUrl } from "@/lib/listing-video";

describe("listing video URLs", () => {
  it("normalizes YouTube and Vimeo URLs to embeddable URLs", () => {
    expect(normalizeListingVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(normalizeListingVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(normalizeListingVideoUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  it("extracts iframe src values without trusting the raw markup", () => {
    const embed = getListingVideoEmbed('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc"></iframe>');

    expect(embed?.providerLabel).toBe("YouTube");
    expect(embed?.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("rejects unsupported or unsafe video links", () => {
    expect(isValidListingVideoUrl("")).toBe(true);
    expect(isValidListingVideoUrl("javascript:alert(1)")).toBe(false);
    expect(isValidListingVideoUrl("https://example.com/watch/video")).toBe(false);
    expect(getListingVideoEmbed("not a url")).toBeNull();
  });
});
