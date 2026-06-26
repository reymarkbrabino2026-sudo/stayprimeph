import "server-only";

import { env } from "@/lib/env";
import { classifyListingPhotoFromFileName, listingPhotoCategoryIds, normalizeListingPhotoCategory, type ListingPhotoCategory } from "@/lib/listing-photo-categories";
import { logger } from "@/lib/logger";

type ListingPhotoClassificationSource = "openai" | "filename" | "fallback";

export type ListingPhotoClassification = {
  category: ListingPhotoCategory;
  confidence: number;
  source: ListingPhotoClassificationSource;
};

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: Array<{
    type?: unknown;
    content?: Array<{
      type?: unknown;
      text?: unknown;
    }>;
  }>;
};

const defaultClassificationModel = "gpt-5.4-mini";
const classificationTimeoutMs = 12_000;

function filenameClassification(fileName: string): ListingPhotoClassification {
  const category = classifyListingPhotoFromFileName(fileName);
  return {
    category,
    confidence: category === "other" ? 0 : 0.55,
    source: category === "other" ? "fallback" : "filename",
  };
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }

  return "";
}

function parseOpenAIClassification(payload: OpenAIResponsePayload): ListingPhotoClassification | null {
  const text = extractOutputText(payload);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as { category?: unknown; confidence?: unknown };
    const category = normalizeListingPhotoCategory(parsed.category);
    const confidence = typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.75;

    return { category, confidence, source: "openai" };
  } catch {
    const category = normalizeListingPhotoCategory(text);
    return category === "other" ? null : { category, confidence: 0.65, source: "openai" };
  }
}

function classificationPrompt() {
  const categories = listingPhotoCategoryIds.map((category) => `"${category}"`).join(", ");
  return [
    "Classify this real-estate listing photo into exactly one category.",
    `Allowed categories: ${categories}.`,
    "Use kitchen for cooking spaces, bedroom for sleeping rooms, bathroom for toilets/showers, living_room for lounge/sala spaces, dining_area for dining tables, exterior for facade/entrance/building shots, pool for swimming pools, outdoor for gardens/patios/balconies, view for scenery/window views, amenities for gyms/workspaces/karaoke/laundry/games, and other only when uncertain.",
    "Return JSON only.",
  ].join(" ");
}

async function classifyWithOpenAI(bytes: Buffer, contentType: string): Promise<ListingPhotoClassification | null> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), classificationTimeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.PHOTO_CLASSIFICATION_MODEL ?? defaultClassificationModel,
        reasoning: { effort: "low" },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: classificationPrompt() },
            { type: "input_image", image_url: `data:${contentType};base64,${bytes.toString("base64")}` },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "listing_photo_category",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["category", "confidence"],
              properties: {
                category: { type: "string", enum: listingPhotoCategoryIds },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      logger.warn("listing_photo_classification_openai_failed", { status: response.status });
      return null;
    }

    return parseOpenAIClassification(await response.json() as OpenAIResponsePayload);
  } catch (error) {
    logger.warn("listing_photo_classification_failed", { error });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function classifyListingPhoto(input: {
  bytes: Buffer;
  contentType: string;
  fileName: string;
}): Promise<ListingPhotoClassification> {
  const openAIClassification = await classifyWithOpenAI(input.bytes, input.contentType);
  if (openAIClassification) return openAIClassification;

  return filenameClassification(input.fileName);
}
