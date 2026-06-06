"use client";

import { create } from "zustand";
import type { HostListingDraft, UploadedPhoto, WizardStepId } from "@/lib/host-wizard-types";

const legacyStorageKey = "stayprimeph-host-wizard";
const storageVersion = 1;

const initialDraft: HostListingDraft = {
  country: "Philippines", street: "", barangay: "", city: "", province: "", zipCode: "", latitude: 14.5995, longitude: 120.9842, locationPinned: false, lastAutoGeocodeAddress: "",
  propertyType: "", privacyType: "", preciseLocation: false, guests: 4, bedrooms: 1, beds: 1, bathrooms: 1, amenityIds: [], photos: [], title: "", highlights: [], description: "",
  bookingMode: "request", basePrice: 2528, weekendPrice: 2579, weekendPremium: 2, cleaningFee: 500, securityDeposit: 0, currency: "PHP", cancellationPolicy: "flexible",
  discounts: { newListing: true, lastMinute: true, weekly: true, monthly: true }, safetyDisclosures: { exteriorCamera: false, noiseMonitor: false, weapons: false },
  residentialAddress: { unit: "", building: "", street: "", barangay: "", city: "", zipCode: "", province: "" }, hostAsBusiness: null, status: "draft",
};

type WizardOwner = { id: string; email: string };
type StoredHostWizardDraft = {
  version: number;
  ownerUserId: string;
  ownerEmail: string;
  currentStep: WizardStepId;
  draft: Partial<HostListingDraft>;
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
    amenityIds: [...initialDraft.amenityIds],
    photos: [...initialDraft.photos],
    highlights: [...initialDraft.highlights],
    discounts: { ...initialDraft.discounts },
    safetyDisclosures: { ...initialDraft.safetyDisclosures },
    residentialAddress: { ...initialDraft.residentialAddress },
  };
}

function mergeDraft(draft?: Partial<HostListingDraft>): HostListingDraft {
  return {
    ...createInitialDraft(),
    ...draft,
    discounts: { ...initialDraft.discounts, ...draft?.discounts },
    safetyDisclosures: { ...initialDraft.safetyDisclosures, ...draft?.safetyDisclosures },
    residentialAddress: { ...initialDraft.residentialAddress, ...draft?.residentialAddress },
  };
}

function userStorageKey(userId: string) {
  return `stayprimeph-host-wizard:${encodeURIComponent(userId)}`;
}

function readStoredDraft(user: WizardOwner): Pick<HostWizardState, "currentStep" | "draft"> {
  if (typeof window === "undefined") return { currentStep: "address", draft: createInitialDraft() };

  window.localStorage.removeItem(legacyStorageKey);

  const storedValue = window.localStorage.getItem(userStorageKey(user.id));
  if (!storedValue) return { currentStep: "address", draft: createInitialDraft() };

  try {
    const stored = JSON.parse(storedValue) as Partial<StoredHostWizardDraft>;
    if (stored.ownerUserId !== user.id) {
      window.localStorage.removeItem(userStorageKey(user.id));
      return { currentStep: "address", draft: createInitialDraft() };
    }

    return {
      currentStep: stored.currentStep ?? "address",
      draft: mergeDraft(stored.draft),
    };
  } catch {
    window.localStorage.removeItem(userStorageKey(user.id));
    return { currentStep: "address", draft: createInitialDraft() };
  }
}

function persistState(state: HostWizardState) {
  if (typeof window === "undefined" || !state.ownerUserId || !state.ownerEmail) return;

  const stored: StoredHostWizardDraft = {
    version: storageVersion,
    ownerUserId: state.ownerUserId,
    ownerEmail: state.ownerEmail,
    currentStep: state.currentStep,
    draft: state.draft,
  };

  window.localStorage.setItem(userStorageKey(state.ownerUserId), JSON.stringify(stored));
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
