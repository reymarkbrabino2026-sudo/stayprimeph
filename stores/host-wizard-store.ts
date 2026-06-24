"use client";

import { create } from "zustand";
import type { HostListingDraft, UploadedPhoto, WizardStepId } from "@/lib/host-wizard-types";

const legacyStorageKey = "stayprimeph-host-wizard";
const userStorageKeyPrefix = "stayprimeph-host-wizard:";
const storageVersion = 2;
const draftRetentionMs = 30 * 24 * 60 * 60 * 1000;

const defaultRooms = [
  {
    id: "sanctuary-suite",
    name: "Sanctuary Suite",
    capacity: 2,
    floor: "Second Floor",
    description: "Private suite for overnight guests.",
    photos: [],
    amenities: ["Smart TV", "Air conditioning"],
    active: true,
  },
  {
    id: "serene-room",
    name: "Serene Room",
    capacity: 4,
    floor: "Second Floor",
    description: "Shared bedroom for families or groups.",
    photos: [],
    amenities: ["Air conditioning"],
    active: true,
  },
  {
    id: "nest-room",
    name: "Nest Room",
    capacity: 6,
    floor: "Second Floor",
    description: "Large sleeping room for overnight packages.",
    photos: [],
    amenities: ["Air conditioning"],
    active: true,
  },
  {
    id: "oasis-room",
    name: "Oasis Room",
    capacity: 8,
    floor: "Ground Floor",
    description: "Ground-floor room with extra guest capacity.",
    photos: [],
    amenities: ["Air conditioning"],
    active: true,
  },
];

const defaultBookingPackages = [
  {
    id: "overnight-full-access",
    name: "Overnight Full Access",
    description: "Whole-villa overnight package with bedroom and amenity access.",
    status: "active" as const,
    displayOrder: 1,
    accessType: "Full access",
    unit: "night" as const,
    weekdayRate: 15000,
    weekendRate: 18000,
    holidayRate: 18000,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 18,
    maxGuests: 20,
    sleepingCapacity: 18,
    durationHours: 21,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    accessibleFloors: ["Ground Floor", "Second Floor"],
    accessibleRoomIds: ["sanctuary-suite", "serene-room", "nest-room", "oasis-room"],
    includedAmenities: ["Heated pool", "Karaoke", "WiFi", "Kitchen", "Board games"],
    excludedAmenities: [],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 1,
    blockedPackageIds: ["daytime-ground-outdoor"],
    enabled: false,
  },
  {
    id: "daytime-ground-outdoor",
    name: "Daytime Ground Floor & Outdoor",
    description: "Daytime package for pool, karaoke, kitchen, and outdoor gathering access.",
    status: "active" as const,
    displayOrder: 2,
    accessType: "Ground floor and outdoor area only",
    unit: "day" as const,
    weekdayRate: 8000,
    weekendRate: 0,
    holidayRate: 0,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 18,
    maxGuests: 20,
    sleepingCapacity: 0,
    durationHours: 8,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "2:00 PM",
    checkOutTime: "10:00 PM",
    accessibleFloors: ["Ground Floor", "Outdoor Areas"],
    accessibleRoomIds: [],
    includedAmenities: ["Heated pool", "Karaoke", "WiFi", "Kitchen", "Patio", "Board games"],
    excludedAmenities: ["Bedrooms", "Second floor access"],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 1,
    blockedPackageIds: ["overnight-full-access"],
    enabled: false,
  },
];

function newUploadScopeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `draft-${crypto.randomUUID()}`;
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const initialDraft: HostListingDraft = {
  uploadScopeId: "",
  country: "Philippines", street: "", barangay: "", city: "", province: "", zipCode: "", latitude: 14.5995, longitude: 120.9842, locationPinned: false, locationConfirmed: false, locationConfirmedAddress: "", lastAutoGeocodeAddress: "",
  propertyType: "", privacyType: "", preciseLocation: false, guests: 4, bedrooms: 1, beds: 1, bathrooms: 1, amenityIds: [], photos: [], title: "", highlights: [], description: "",
  rooms: defaultRooms,
  bookingType: "stay", bookingMode: "request", pricingMode: "simple", basePrice: 2528, weekendPrice: 2579, holidayPrice: 0, holidayDates: [], seasonalRates: [], weekendPremium: 2, cleaningFee: 500, securityDeposit: 0, currency: "PHP", cancellationPolicy: "flexible",
  discounts: { newListing: true, lastMinute: true, weekly: true, monthly: true }, safetyDisclosures: { exteriorCamera: false, noiseMonitor: false, weapons: false },
  residentialAddress: { unit: "", building: "", street: "", barangay: "", city: "", zipCode: "", province: "" }, hostAsBusiness: null, status: "draft", bookingPackages: defaultBookingPackages,
};

type WizardOwner = { id: string; email: string };
type StoredHostWizardDraft = {
  version: number;
  ownerUserId: string;
  currentStep: WizardStepId;
  draft: Partial<HostListingDraft>;
  updatedAt?: string;
};

interface HostWizardState {
  ownerUserId: string | null;
  ownerEmail: string | null;
  initialized: boolean;
  currentStep: WizardStepId;
  draft: HostListingDraft;
  initializeForUser: (user: WizardOwner, options?: { fresh?: boolean }) => void;
  setStep: (step: WizardStepId) => void;
  updateDraft: (patch: Partial<HostListingDraft>) => void;
  toggleAmenity: (id: string) => void;
  toggleHighlight: (id: string) => void;
  addPhotos: (photos: UploadedPhoto[]) => void;
  removePhoto: (id: string) => void;
  setCoverPhoto: (id: string) => void;
  movePhoto: (id: string, direction: -1 | 1) => void;
  resetDraft: () => void;
}

function createInitialDraft(): HostListingDraft {
  return {
    ...initialDraft,
    uploadScopeId: newUploadScopeId(),
    amenityIds: [...initialDraft.amenityIds],
    rooms: initialDraft.rooms.map((item) => ({ ...item, photos: [...item.photos], amenities: [...item.amenities] })),
    photos: [...initialDraft.photos],
    highlights: [...initialDraft.highlights],
    holidayDates: [...initialDraft.holidayDates],
    seasonalRates: initialDraft.seasonalRates.map((item) => ({ ...item })),
    bookingPackages: initialDraft.bookingPackages.map((item) => ({ ...item, holidayDates: [...(item.holidayDates ?? [])], seasonalRates: (item.seasonalRates ?? []).map((season) => ({ ...season })) })),
    discounts: { ...initialDraft.discounts },
    safetyDisclosures: { ...initialDraft.safetyDisclosures },
    residentialAddress: { ...initialDraft.residentialAddress },
  };
}

function normalizeBookingPackage(pkg: Partial<HostListingDraft["bookingPackages"][number]>, index: number) {
  const seeded = initialDraft.bookingPackages.find((item) => item.id === pkg.id) ?? initialDraft.bookingPackages[index] ?? initialDraft.bookingPackages[0];

  return {
    ...seeded,
    ...pkg,
    id: pkg.id || seeded.id,
    name: pkg.name || seeded.name,
    description: pkg.description ?? seeded.description,
    status: pkg.status ?? seeded.status,
    displayOrder: pkg.displayOrder ?? seeded.displayOrder ?? index,
    accessibleFloors: pkg.accessibleFloors?.length ? [...pkg.accessibleFloors] : [...seeded.accessibleFloors],
    accessibleRoomIds: pkg.accessibleRoomIds?.length ? [...pkg.accessibleRoomIds] : [...seeded.accessibleRoomIds],
    includedAmenities: pkg.includedAmenities?.length ? [...pkg.includedAmenities] : [...seeded.includedAmenities],
    excludedAmenities: pkg.excludedAmenities ? [...pkg.excludedAmenities] : [...seeded.excludedAmenities],
    availableDays: pkg.availableDays?.length ? [...pkg.availableDays] : [...seeded.availableDays],
    holidayDates: pkg.holidayDates ? [...pkg.holidayDates] : [...(seeded.holidayDates ?? [])],
    seasonalRates: pkg.seasonalRates ? pkg.seasonalRates.map((season) => ({ ...season })) : (seeded.seasonalRates ?? []).map((season) => ({ ...season })),
    blockedPackageIds: pkg.blockedPackageIds ? [...pkg.blockedPackageIds] : [...seeded.blockedPackageIds],
  };
}

function mergeDraft(draft?: Partial<HostListingDraft>): HostListingDraft {
  return {
    ...createInitialDraft(),
    ...draft,
    uploadScopeId: draft?.uploadScopeId || newUploadScopeId(),
    discounts: { ...initialDraft.discounts, ...draft?.discounts },
    safetyDisclosures: { ...initialDraft.safetyDisclosures, ...draft?.safetyDisclosures },
    residentialAddress: { ...initialDraft.residentialAddress, ...draft?.residentialAddress },
    holidayDates: draft?.holidayDates ? [...draft.holidayDates] : [...initialDraft.holidayDates],
    seasonalRates: draft?.seasonalRates ? draft.seasonalRates.map((item) => ({ ...item })) : initialDraft.seasonalRates.map((item) => ({ ...item })),
    rooms: draft?.rooms?.length ? draft.rooms.map((item) => ({ ...item, photos: [...item.photos], amenities: [...item.amenities] })) : initialDraft.rooms.map((item) => ({ ...item, photos: [...item.photos], amenities: [...item.amenities] })),
    bookingPackages: draft?.bookingPackages?.length
      ? draft.bookingPackages.map((item, index) => normalizeBookingPackage(item, index))
      : initialDraft.bookingPackages.map((item, index) => normalizeBookingPackage(item, index)),
  };
}

export function sanitizeHostWizardDraftForStorage(draft: HostListingDraft | Partial<HostListingDraft>): Partial<HostListingDraft> {
  const normalized = mergeDraft(draft);

  return {
    uploadScopeId: normalized.uploadScopeId,
    country: normalized.country,
    street: normalized.street,
    barangay: normalized.barangay,
    city: normalized.city,
    province: normalized.province,
    zipCode: normalized.zipCode,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    locationPinned: normalized.locationPinned,
    locationConfirmed: normalized.locationConfirmed,
    locationConfirmedAddress: normalized.locationConfirmedAddress,
    lastAutoGeocodeAddress: normalized.lastAutoGeocodeAddress,
    propertyType: normalized.propertyType,
    privacyType: normalized.privacyType,
    preciseLocation: normalized.preciseLocation,
    guests: normalized.guests,
    bedrooms: normalized.bedrooms,
    beds: normalized.beds,
    bathrooms: normalized.bathrooms,
    rooms: normalized.rooms.map((item) => ({ ...item, photos: [...item.photos], amenities: [...item.amenities] })),
    amenityIds: [...normalized.amenityIds],
    photos: normalized.photos.map((photo) => ({ ...photo })),
    title: normalized.title,
    highlights: [...normalized.highlights],
    description: normalized.description,
    bookingMode: normalized.bookingMode,
    bookingType: normalized.bookingType,
    pricingMode: normalized.pricingMode,
    basePrice: normalized.basePrice,
    weekendPrice: normalized.weekendPrice,
    holidayPrice: normalized.holidayPrice,
    holidayDates: [...normalized.holidayDates],
    seasonalRates: normalized.seasonalRates.map((item) => ({ ...item })),
    weekendPremium: normalized.weekendPremium,
    cleaningFee: normalized.cleaningFee,
    securityDeposit: normalized.securityDeposit,
    currency: normalized.currency,
    cancellationPolicy: normalized.cancellationPolicy,
    discounts: { ...normalized.discounts },
    safetyDisclosures: { ...normalized.safetyDisclosures },
    residentialAddress: { ...normalized.residentialAddress },
    hostAsBusiness: normalized.hostAsBusiness,
    status: normalized.status,
    bookingPackages: normalized.bookingPackages.map((item) => ({ ...item })),
  };
}

export function hostWizardStorageKey(userId: string) {
  return `${userStorageKeyPrefix}${encodeURIComponent(userId)}`;
}

export function clearStoredHostWizardDraft(userId?: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(legacyStorageKey);
  if (userId) {
    window.localStorage.removeItem(hostWizardStorageKey(userId));
    return;
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(userStorageKeyPrefix)) window.localStorage.removeItem(key);
  }
}

function expiredDraft(updatedAt: string | undefined) {
  if (!updatedAt) return false;
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp > draftRetentionMs;
}

function readStoredDraft(user: WizardOwner): Pick<HostWizardState, "currentStep" | "draft"> {
  if (typeof window === "undefined") return { currentStep: "address", draft: createInitialDraft() };

  window.localStorage.removeItem(legacyStorageKey);

  const storageKey = hostWizardStorageKey(user.id);
  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) return { currentStep: "address", draft: createInitialDraft() };

  try {
    const stored = JSON.parse(storedValue) as Partial<StoredHostWizardDraft>;
    if (stored.ownerUserId !== user.id || expiredDraft(stored.updatedAt)) {
      window.localStorage.removeItem(storageKey);
      return { currentStep: "address", draft: createInitialDraft() };
    }

    const draft = mergeDraft(sanitizeHostWizardDraftForStorage(mergeDraft(stored.draft)));
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: storageVersion,
      ownerUserId: user.id,
      currentStep: stored.currentStep ?? "address",
      draft: sanitizeHostWizardDraftForStorage(draft),
      updatedAt: new Date().toISOString(),
    } satisfies StoredHostWizardDraft));

    return {
      currentStep: stored.currentStep ?? "address",
      draft,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { currentStep: "address", draft: createInitialDraft() };
  }
}

function persistState(state: HostWizardState) {
  if (typeof window === "undefined" || !state.ownerUserId || !state.ownerEmail) return;

  const stored: StoredHostWizardDraft = {
    version: storageVersion,
    ownerUserId: state.ownerUserId,
    currentStep: state.currentStep,
    draft: sanitizeHostWizardDraftForStorage(state.draft),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(hostWizardStorageKey(state.ownerUserId), JSON.stringify(stored));
}

export const useHostWizardStore = create<HostWizardState>()((set) => ({
  ownerUserId: null,
  ownerEmail: null,
  initialized: false,
  currentStep: "address",
  draft: createInitialDraft(),
  initializeForUser: (user, options) => set((state) => {
    if (options?.fresh) {
      const next = {
        ...state,
        ownerUserId: user.id,
        ownerEmail: user.email,
        initialized: true,
        currentStep: "address" as WizardStepId,
        draft: createInitialDraft(),
      };
      persistState(next);
      return next;
    }

    if (state.initialized && state.ownerUserId === user.id) {
      const next = { ...state, ownerEmail: user.email };
      persistState(next);
      return next;
    }

    const stored = readStoredDraft(user);
    return {
      ...state,
      ownerUserId: user.id,
      ownerEmail: user.email,
      initialized: true,
      currentStep: stored.currentStep,
      draft: stored.draft,
    };
  }),
  setStep: (currentStep) => set((state) => {
    const next = { ...state, currentStep };
    persistState(next);
    return next;
  }),
  updateDraft: (patch) => set((state) => {
    const next = { ...state, draft: { ...state.draft, ...patch } };
    persistState(next);
    return next;
  }),
  toggleAmenity: (id) => set((state) => {
    const next = {
      ...state,
      draft: {
        ...state.draft,
        amenityIds: state.draft.amenityIds.includes(id) ? state.draft.amenityIds.filter((item) => item !== id) : [...state.draft.amenityIds, id],
      },
    };
    persistState(next);
    return next;
  }),
  toggleHighlight: (id) => set((state) => {
    const selected = state.draft.highlights;
    const highlights = selected.includes(id) ? selected.filter((item) => item !== id) : selected.length < 2 ? [...selected, id] : selected;
    const next = { ...state, draft: { ...state.draft, highlights } };
    persistState(next);
    return next;
  }),
  addPhotos: (photos) => set((state) => {
    const next = { ...state, draft: { ...state.draft, photos: [...state.draft.photos, ...photos].map((photo, index) => ({ ...photo, isCover: index === 0 })) } };
    persistState(next);
    return next;
  }),
  removePhoto: (id) => set((state) => {
    const next = { ...state, draft: { ...state.draft, photos: state.draft.photos.filter((photo) => photo.id !== id).map((photo, index) => ({ ...photo, isCover: index === 0 })) } };
    persistState(next);
    return next;
  }),
  setCoverPhoto: (id) => set((state) => {
    const next = { ...state, draft: { ...state.draft, photos: state.draft.photos.map((photo) => ({ ...photo, isCover: photo.id === id })) } };
    persistState(next);
    return next;
  }),
  movePhoto: (id, direction) => set((state) => {
    const photos = [...state.draft.photos];
    const index = photos.findIndex((photo) => photo.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= photos.length) return state;

    [photos[index], photos[nextIndex]] = [photos[nextIndex], photos[index]];
    const next = { ...state, draft: { ...state.draft, photos } };
    persistState(next);
    return next;
  }),
  resetDraft: () => set((state) => {
    const next = { ...state, currentStep: "address" as WizardStepId, draft: createInitialDraft() };
    persistState(next);
    return next;
  }),
}));
