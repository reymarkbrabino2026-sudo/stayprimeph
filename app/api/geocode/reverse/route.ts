import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit } from "@/lib/rate-limit";

interface NominatimReverseResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function GET(request: Request) {
  const rateLimit = await checkDistributedRateLimit(`reverse-geocode:${request.headers.get("x-forwarded-for") ?? "local"}`, 30);
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

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(parsedLatitude))}&lon=${encodeURIComponent(String(parsedLongitude))}`,
    {
      headers: {
        "User-Agent": "stayprimeph-local-dev/1.0",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    logger.error("reverse_geocode_upstream_failed", { status: response.status });
    return NextResponse.json({ error: "Reverse geocoding service unavailable." }, { status: 502 });
  }

  const result = (await response.json()) as NominatimReverseResult;

  return NextResponse.json({
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
  });
}
