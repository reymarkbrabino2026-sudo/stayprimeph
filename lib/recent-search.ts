export const recentSearchStorageKey = "stayprimeph:recent-search";

export type RecentSearchPayload = {
  href: string;
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  savedAt: number;
};
