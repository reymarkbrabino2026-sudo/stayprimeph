import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { fetchWithTimeout, UpstreamTimeoutError } from "@/lib/upstream-http";

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function GET(request: Request) {
  const rateLimit = await checkDistributedRateLimit(rateLimitKey("geocode", request.headers.get("x-forwarded-for")), 30);
  if (rateLimit.limited) {
    logger.warn("rate_limited", { route: "/api/geocode" });
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    logger.warn("geocode_missing_query");
    return NextResponse.json({ error: "Missing address query." }, { status: 400 });
  }
  if (query.length > 200) {
    logger.warn("geocode_query_too_long");
    return NextResponse.json({ error: "Address query is too long." }, { status: 400 });
  }


  const parts = query.split(",").map((part) => part.trim()).filter(Boolean);
  const maybeZip = parts.at(-1);
  const withoutZip = maybeZip && /^\d{4,}$/.test(maybeZip) ? parts.slice(0, -1) : parts;
  const candidates = Array.from(new Set([
    query,
    withoutZip.join(", "),
  ].filter(Boolean)));

  for (const candidate of candidates) {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=ph&q=${encodeURIComponent(candidate)}`,
        {
          headers: {
            "User-Agent": "StayPrimePH/1.0",
          },
          cache: "no-store",
        },
      );
    } catch (error) {
      logger.error("geocode_upstream_unreachable", {
        error,
        timedOut: error instanceof UpstreamTimeoutError,
      });
      return NextResponse.json({ error: "Geocoding service unavailable." }, { status: 502 });
    }

    if (!response.ok) {
      logger.error("geocode_upstream_failed", { status: response.status });
      return NextResponse.json({ error: "Geocoding service unavailable." }, { status: 502 });
    }

    let results: NominatimSearchResult[];
    try {
      results = (await response.json()) as NominatimSearchResult[];
    } catch (error) {
      logger.error("geocode_upstream_invalid_json", { error });
      return NextResponse.json({ error: "Geocoding service unavailable." }, { status: 502 });
    }

    const [result] = results;

    if (result) {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      return NextResponse.json({
        latitude,
        longitude,
        displayName: result.display_name,
      });
    }
  }

  return NextResponse.json({ error: "Address not found." }, { status: 404 });
}
