import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { Review } from "@/lib/types";

const storeFileName = "reviews.json";

export async function readStoredReviews(): Promise<Review[]> {
  return readJsonStore<Review>(storeFileName);
}

export async function writeStoredReviews(reviews: Review[]) {
  await writeJsonStore(storeFileName, reviews);
}
