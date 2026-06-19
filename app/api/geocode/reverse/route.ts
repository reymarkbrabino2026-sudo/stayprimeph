import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { fetchWithTimeout, UpstreamTimeoutError } from "@/lib/upstream-http";

interface NominatimReverseResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function GET(request: Request) {
  const rateLimit = await checkDistributedRateLimit(rateLimitKey("reverse-geocode", request.headers.get("x-forwarded-for")), 30);
  if (rateLimit.limited) {
    logger.warn("rate_limited", { route: "/api/geocode/reverse" });
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");

  if (!latitude || !longitude) {
    logger.warn("reverse_geocode_missing_coordinates");
    return NextResponse.json({ error: "Missing coordinates." }, { status: 400 });
  }
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90 ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    logger.warn("reverse_geocode_invalid_coordinates");
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(parsedLatitude))}&lon=${encodeURIComponent(String(parsedLongitude))}`,
      {
        headers: {
          "User-Agent": "StayPrimePH/1.0",
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    logger.error("reverse_geocode_upstream_unreachable", {
      error,
      timedOut: error instanceof UpstreamTimeoutError,
    });
    return NextResponse.json({ error: "Reverse geocoding service unavailable." }, { status: 502 });
  }

  if (!response.ok) {
    logger.error("reverse_geocode_upstream_failed", { status: response.status });
    return NextResponse.json({ error: "Reverse geocoding service unavailable." }, { status: 502 });
  }

  let result: NominatimReverseResult;
  try {
    result = (await response.json()) as NominatimReverseResult;
  } catch (error) {
    logger.error("reverse_geocode_upstream_invalid_json", { error });
    return NextResponse.json({ error: "Reverse geocoding service unavailable." }, { status: 502 });
  }

  return NextResponse.json({
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
  });
}
