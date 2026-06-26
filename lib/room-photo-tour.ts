import type { PropertyImage, PropertyRoom } from "@/lib/types";
import { listingPhotoCategories, listingPhotoCategoryLabel, listingPhotoCategoryRank, normalizeListingPhotoCategory, type ListingPhotoCategory } from "@/lib/listing-photo-categories";

export interface PhotoTourPhoto {
  id: string;
  imageUrl: string;
  alt: string;
  category?: ListingPhotoCategory;
}

export interface PhotoTourGroup {
  id: string;
  title: string;
  summary: string;
  photos: PhotoTourPhoto[];
}

export function isPhotoTourImage(src?: string): src is string {
  return Boolean(
    src &&
      src !== "pending-upload" &&
      (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")),
  );
}

function toAnchorId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `photo-tour-${slug || "section"}`;
}

function photoCountLabel(count: number) {
  return `${count} photo${count === 1 ? "" : "s"}`;
}

function uniqueListingPhotos(images: PropertyImage[], propertyTitle: string) {
  const seen = new Set<string>();

  return images
    .filter((image) => isPhotoTourImage(image.imageUrl))
    .filter((image) => {
      if (seen.has(image.imageUrl)) return false;
      seen.add(image.imageUrl);
      return true;
    })
    .map((image, index) => ({
      id: image.id || `listing-photo-${index + 1}`,
      imageUrl: image.imageUrl,
      alt: `${propertyTitle} photo ${index + 1}`,
      category: normalizeListingPhotoCategory(image.category),
    }));
}

function uniqueRoomPhotos(room: PropertyRoom, propertyTitle: string) {
  const seen = new Set<string>();

  return room.photos
    .filter((imageUrl) => isPhotoTourImage(imageUrl))
    .filter((imageUrl) => {
      if (seen.has(imageUrl)) return false;
      seen.add(imageUrl);
      return true;
    })
    .map((imageUrl, index) => ({
      id: `${room.id}-photo-${index + 1}`,
      imageUrl,
      alt: `${propertyTitle} ${room.name} photo ${index + 1}`,
    }));
}

function roomSummary(room: PropertyRoom, photoCount: number) {
  const details = [
    room.floor,
    room.capacity > 0 ? `${room.capacity} guest${room.capacity === 1 ? "" : "s"}` : undefined,
    photoCountLabel(photoCount),
  ].filter(Boolean);

  return details.join(" - ");
}

function groupedListingPhotosByCategory(listingPhotos: PhotoTourPhoto[]): PhotoTourGroup[] {
  const groups = new Map<ListingPhotoCategory, PhotoTourPhoto[]>();

  for (const photo of listingPhotos) {
    const category = normalizeListingPhotoCategory(photo.category);
    groups.set(category, [...(groups.get(category) ?? []), photo]);
  }

  return listingPhotoCategories
    .filter((category) => groups.has(category.id))
    .sort((left, right) => listingPhotoCategoryRank(left.id) - listingPhotoCategoryRank(right.id))
    .map((category) => {
      const photos = groups.get(category.id) ?? [];
      return {
        id: toAnchorId(category.label),
        title: listingPhotoCategoryLabel(category.id),
        summary: photoCountLabel(photos.length),
        photos,
      };
    });
}

export function buildRoomPhotoTourGroups({
  propertyTitle,
  propertyTypeLabel,
  listingImages,
  rooms = [],
}: {
  propertyTitle: string;
  propertyTypeLabel: string;
  listingImages: PropertyImage[];
  rooms?: PropertyRoom[];
}): PhotoTourGroup[] {
  const listingPhotos = uniqueListingPhotos(listingImages, propertyTitle);
  const activeRooms = rooms.filter((room) => room.active);
  const groups: PhotoTourGroup[] = [];
  const hasDetectedListingCategories = listingPhotos.some((photo) => normalizeListingPhotoCategory(photo.category) !== "other");

  if (hasDetectedListingCategories) {
    groups.push(...groupedListingPhotosByCategory(listingPhotos));
  } else if (listingPhotos.length > 0) {
    const featuredPhotos = listingPhotos.slice(0, Math.min(listingPhotos.length, 5));
    groups.push({
      id: toAnchorId("featured"),
      title: listingPhotos.length <= 5 && activeRooms.length === 0 ? "All photos" : "Featured photos",
      summary: `${propertyTypeLabel} overview - ${photoCountLabel(featuredPhotos.length)}`,
      photos: featuredPhotos,
    });
  }

  for (const room of activeRooms) {
    const photos = uniqueRoomPhotos(room, propertyTitle);
    if (!photos.length) continue;

    groups.push({
      id: toAnchorId(room.id || room.name),
      title: room.name,
      summary: roomSummary(room, photos.length),
      photos,
    });
  }

  const additionalPhotos = hasDetectedListingCategories ? [] : listingPhotos.slice(5);
  if (additionalPhotos.length > 0) {
    groups.push({
      id: toAnchorId("additional photos"),
      title: "Additional photos",
      summary: photoCountLabel(additionalPhotos.length),
      photos: additionalPhotos,
    });
  }

  return groups;
}
