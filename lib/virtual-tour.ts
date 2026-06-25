export const VIRTUAL_TOUR_URL_MAX_LENGTH = 2048;

export const virtualTourFrameSources = [
  "https://my.matterport.com",
  "https://kuula.co",
  "https://www.kuula.co",
  "https://www.youtube.com",
  "https://player.vimeo.com",
  "https://app.cloudpano.com",
  "https://viewer.cloudpano.com",
  "https://cloudpano.com",
];

type VirtualTourProvider = "matterport" | "kuula" | "youtube" | "vimeo" | "cloudpano";

export type VirtualTourEmbed = {
  provider: VirtualTourProvider;
  providerLabel: string;
  embedUrl: string;
  originalUrl: string;
};

const providerLabels: Record<VirtualTourProvider, string> = {
  matterport: "Matterport",
  kuula: "Kuula",
  youtube: "YouTube 360",
  vimeo: "Vimeo",
  cloudpano: "CloudPano",
};

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
  return prefix === "embed" || prefix === "shorts" ? id ?? "" : "";
}

function youtubeEmbedUrl(url: URL) {
  const id = youtubeVideoId(url);
  return /^[A-Za-z0-9_-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : "";
}

function vimeoEmbedUrl(url: URL) {
  const host = cleanHost(url);
  const segments = url.pathname.split("/").filter(Boolean);
  const id = host === "player.vimeo.com" && segments[0] === "video" ? segments[1] : segments[0];

  return (host === "vimeo.com" || host === "player.vimeo.com") && /^\d+$/.test(id ?? "")
    ? `https://player.vimeo.com/video/${id}`
    : "";
}

function matterportEmbedUrl(url: URL) {
  if (cleanHost(url) !== "my.matterport.com") return "";
  if (!url.pathname.startsWith("/show")) return "";

  const modelId = url.searchParams.get("m");
  if (!modelId) return url.toString();

  const embed = new URL("https://my.matterport.com/show/");
  embed.searchParams.set("m", modelId);
  return embed.toString();
}

function safeSameProviderUrl(url: URL, hosts: string[]) {
  return hosts.includes(cleanHost(url)) ? url.toString() : "";
}

export function normalizeVirtualTourUrl(value: unknown) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > VIRTUAL_TOUR_URL_MAX_LENGTH) return undefined;

  const url = parseHttpUrl(trimmed);
  return url?.toString();
}

export function isValidVirtualTourUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return true;
  return Boolean(normalizeVirtualTourUrl(value));
}

export function getVirtualTourEmbed(value: unknown): VirtualTourEmbed | null {
  const originalUrl = normalizeVirtualTourUrl(value);
  if (!originalUrl) return null;

  const url = parseHttpUrl(originalUrl);
  if (!url) return null;

  const candidates: Array<{ provider: VirtualTourProvider; embedUrl: string }> = [
    { provider: "matterport", embedUrl: matterportEmbedUrl(url) },
    { provider: "youtube", embedUrl: youtubeEmbedUrl(url) },
    { provider: "vimeo", embedUrl: vimeoEmbedUrl(url) },
    { provider: "kuula", embedUrl: safeSameProviderUrl(url, ["kuula.co"]) },
    { provider: "cloudpano", embedUrl: safeSameProviderUrl(url, ["cloudpano.com", "app.cloudpano.com", "viewer.cloudpano.com"]) },
  ];

  const match = candidates.find((candidate) => candidate.embedUrl);
  if (!match) return null;

  return {
    provider: match.provider,
    providerLabel: providerLabels[match.provider],
    embedUrl: match.embedUrl,
    originalUrl,
  };
}
