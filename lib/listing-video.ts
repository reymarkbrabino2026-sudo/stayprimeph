export const LISTING_VIDEO_URL_MAX_LENGTH = 4096;

export const listingVideoFrameSources = [
  "https://www.youtube.com",
  "https://player.vimeo.com",
];

type ListingVideoProvider = "youtube" | "vimeo";

export type ListingVideoEmbed = {
  provider: ListingVideoProvider;
  providerLabel: string;
  embedUrl: string;
  originalUrl: string;
};

const providerLabels: Record<ListingVideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&#38;/g, "&");
}

function extractUrlCandidate(value: string) {
  const trimmed = value.trim();
  const iframeSrc = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  return decodeHtmlEntities(iframeSrc ?? trimmed);
}

function parseHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function cleanHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function youtubeVideoId(url: URL) {
  const host = cleanHost(url);
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return "";

  if (url.pathname === "/watch") return url.searchParams.get("v") ?? "";

  const [prefix, id] = url.pathname.split("/").filter(Boolean);
  return prefix === "embed" || prefix === "shorts" || prefix === "live" || prefix === "v" ? id ?? "" : "";
}

function youtubeEmbedUrl(url: URL) {
  const id = youtubeVideoId(url);
  return /^[A-Za-z0-9_-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : "";
}

function vimeoEmbedUrl(url: URL) {
  const host = cleanHost(url);
  const segments = url.pathname.split("/").filter(Boolean);
  const id = host === "player.vimeo.com" && segments[0] === "video" ? segments[1] : segments[0];

  if ((host !== "vimeo.com" && host !== "player.vimeo.com") || !/^\d+$/.test(id ?? "")) return "";

  const embed = new URL(`https://player.vimeo.com/video/${id}`);
  const hash = url.searchParams.get("h");
  if (hash) embed.searchParams.set("h", hash);
  return embed.toString();
}

export function getListingVideoEmbed(value: unknown): ListingVideoEmbed | null {
  if (typeof value !== "string") return null;

  const candidate = extractUrlCandidate(value);
  if (!candidate || candidate.length > LISTING_VIDEO_URL_MAX_LENGTH) return null;

  const url = parseHttpUrl(candidate);
  if (!url) return null;

  const candidates: Array<{ provider: ListingVideoProvider; embedUrl: string }> = [
    { provider: "youtube", embedUrl: youtubeEmbedUrl(url) },
    { provider: "vimeo", embedUrl: vimeoEmbedUrl(url) },
  ];
  const match = candidates.find((item) => item.embedUrl);
  if (!match) return null;

  return {
    provider: match.provider,
    providerLabel: providerLabels[match.provider],
    embedUrl: match.embedUrl,
    originalUrl: url.toString(),
  };
}

export function normalizeListingVideoUrl(value: unknown) {
  return getListingVideoEmbed(value)?.embedUrl;
}

export function isValidListingVideoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return true;
  return Boolean(getListingVideoEmbed(value));
}
