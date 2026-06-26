export const listingPhotoCategoryIds = [
  "exterior",
  "living_room",
  "kitchen",
  "dining_area",
  "bedroom",
  "bathroom",
  "pool",
  "outdoor",
  "view",
  "amenities",
  "other",
] as const;

export type ListingPhotoCategory = typeof listingPhotoCategoryIds[number];

export type ListingPhotoCategoryDefinition = {
  id: ListingPhotoCategory;
  label: string;
  keywords: string[];
};

export const listingPhotoCategories: ListingPhotoCategoryDefinition[] = [
  { id: "exterior", label: "Exterior", keywords: ["facade", "front", "exterior", "building", "house", "entrance", "gate", "driveway", "parking"] },
  { id: "living_room", label: "Living Room", keywords: ["living", "lounge", "sofa", "couch", "sala", "tv room", "family room"] },
  { id: "kitchen", label: "Kitchen", keywords: ["kitchen", "cook", "cooking", "counter", "stove", "oven", "sink", "fridge", "refrigerator"] },
  { id: "dining_area", label: "Dining Area", keywords: ["dining", "table", "breakfast", "bar counter"] },
  { id: "bedroom", label: "Bedroom", keywords: ["bed", "bedroom", "sleeping", "suite", "mattress", "bunk", "master"] },
  { id: "bathroom", label: "Bathroom", keywords: ["bath", "bathroom", "toilet", "shower", "washroom", "restroom", "powder room"] },
  { id: "pool", label: "Pool", keywords: ["pool", "swimming", "jacuzzi", "hot tub", "spa"] },
  { id: "outdoor", label: "Outdoor", keywords: ["garden", "yard", "patio", "terrace", "balcony", "deck", "lanai", "outdoor", "grill"] },
  { id: "view", label: "View", keywords: ["view", "skyline", "mountain", "sea", "ocean", "lake", "sunset", "window view"] },
  { id: "amenities", label: "Amenities", keywords: ["amenity", "gym", "workspace", "karaoke", "game", "laundry", "washer", "wifi", "board game"] },
  { id: "other", label: "Other Photos", keywords: [] },
];

const listingPhotoCategorySet = new Set<ListingPhotoCategory>(listingPhotoCategoryIds);

const categoryAliases = new Map<string, ListingPhotoCategory>([
  ["bedrooms", "bedroom"],
  ["bed_room", "bedroom"],
  ["sleeping_area", "bedroom"],
  ["bathrooms", "bathroom"],
  ["bath_room", "bathroom"],
  ["comfort_room", "bathroom"],
  ["cr", "bathroom"],
  ["living", "living_room"],
  ["living_area", "living_room"],
  ["lounge", "living_room"],
  ["sala", "living_room"],
  ["dining", "dining_area"],
  ["dining_room", "dining_area"],
  ["outside", "outdoor"],
  ["outdoors", "outdoor"],
  ["pool_area", "pool"],
  ["swimming_pool", "pool"],
  ["front", "exterior"],
  ["entrance", "exterior"],
  ["facade", "exterior"],
  ["amenity", "amenities"],
  ["misc", "other"],
  ["unknown", "other"],
  ["uncategorized", "other"],
]);

function normalizedCategoryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeListingPhotoCategory(value: unknown): ListingPhotoCategory {
  if (typeof value !== "string") return "other";

  const key = normalizedCategoryKey(value);
  if (listingPhotoCategorySet.has(key as ListingPhotoCategory)) return key as ListingPhotoCategory;
  return categoryAliases.get(key) ?? "other";
}

export function listingPhotoCategoryLabel(value: unknown) {
  const category = normalizeListingPhotoCategory(value);
  return listingPhotoCategories.find((item) => item.id === category)?.label ?? "Other Photos";
}

export function listingPhotoCategoryRank(value: unknown) {
  const category = normalizeListingPhotoCategory(value);
  const index = listingPhotoCategoryIds.indexOf(category);
  return index < 0 ? listingPhotoCategoryIds.length : index;
}

export function classifyListingPhotoFromFileName(fileName: string): ListingPhotoCategory {
  const searchable = normalizedCategoryKey(fileName).replace(/_/g, " ");

  for (const category of listingPhotoCategories) {
    if (category.id === "other") continue;
    if (category.keywords.some((keyword) => searchable.includes(keyword))) return category.id;
  }

  return "other";
}
