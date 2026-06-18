import type { User } from "@/lib/types";

export type PersonalInfoField =
  | "legalName"
  | "preferredName"
  | "email"
  | "phone"
  | "identity"
  | "residentialAddress"
  | "mailingAddress"
  | "emergencyContact";

export type PersonalInfoState = Record<PersonalInfoField, string>;

export type NotificationScope = "offers" | "account";

export type NotificationChannels = {
  email: boolean;
  push: boolean;
  sms: boolean;
};

export type NotificationPreferencesState = {
  preferences: Record<string, NotificationChannels>;
  unsubscribed: boolean;
};

export type PrivacySettingId =
  | "readReceipts"
  | "searchEngines"
  | "homeCity"
  | "tripType"
  | "lengthOfStay"
  | "bookedServices"
  | "aiFeatures";

export type PrivacySettingsState = {
  settings: Record<PrivacySettingId, boolean>;
  blockedPeople: string[];
  dataRequestedAt: string | null;
  deletionRequestedAt: string | null;
  deletionVerifiedAt: string | null;
};

export type BookingPermissionId = "profilePhoto" | "verifiedPhone" | "instantBooking" | "newGuests";

export type BookingPermissionState = Record<BookingPermissionId, boolean>;

export type WorkTravelProfile = {
  email: string;
  companyName: string;
  department: string;
  employeeId: string;
  includeBusinessReceipts: boolean;
  verified: boolean;
};

export type ProfessionalHostingToolId = "professionalTools" | "ruleSets" | "bulkEditing";

export type ProfessionalHostingToolState = Record<ProfessionalHostingToolId, boolean>;

export type AccountSettingsData = {
  personalInfo: PersonalInfoState;
  notifications: Record<NotificationScope, NotificationPreferencesState>;
  privacy: PrivacySettingsState;
  bookingPermissions: BookingPermissionState;
  workTravel: WorkTravelProfile;
  professionalHostingTools: ProfessionalHostingToolState;
  financial: FinancialSettingsState;
};

export type AccountActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function defaultPersonalInfo(user: Pick<User, "name" | "email" | "phone">): PersonalInfoState {
  return {
    legalName: user.name,
    preferredName: "",
    email: user.email,
    phone: user.phone,
    identity: "",
    residentialAddress: "",
    mailingAddress: "",
    emergencyContact: "",
  };
}

export function defaultNotificationChannels(defaultOn: boolean): NotificationChannels {
  return { email: defaultOn, push: defaultOn, sms: false };
}

export function defaultNotificationPreferences(preferences: Record<string, NotificationChannels> = {}): NotificationPreferencesState {
  return { preferences, unsubscribed: false };
}

export function defaultPrivacySettings(): PrivacySettingsState {
  return {
    settings: {
      readReceipts: true,
      searchEngines: false,
      homeCity: false,
      tripType: false,
      lengthOfStay: true,
      bookedServices: false,
      aiFeatures: true,
    },
    blockedPeople: [],
    dataRequestedAt: null,
    deletionRequestedAt: null,
    deletionVerifiedAt: null,
  };
}

export const defaultBookingPermissions: BookingPermissionState = {
  profilePhoto: false,
  verifiedPhone: true,
  instantBooking: false,
  newGuests: true,
};

export const defaultWorkTravelProfile: WorkTravelProfile = {
  email: "",
  companyName: "",
  department: "",
  employeeId: "",
  includeBusinessReceipts: true,
  verified: false,
};

export const defaultProfessionalHostingTools: ProfessionalHostingToolState = {
  professionalTools: true,
  ruleSets: false,
  bulkEditing: false,
};

export type SavedPaymentMethod = {
  id: string;
  cardholder: string;
  brand: string;
  last4: string;
  expiry: string;
  billingZip: string;
};

export type GiftCredit = {
  code: string;
  amount: number;
};

export type Coupon = {
  code: string;
  discount: string;
};

export type PayoutMethod = {
  id: string;
  type: "Bank account" | "PayPal" | "GCash";
  accountName: string;
  bankName: string;
  accountLast4: string;
  currency: string;
};

export type TaxpayerInfo = {
  legalName: string;
  country: string;
  taxId: string;
  address: string;
};

export type VatInfo = {
  businessName: string;
  country: string;
  vatId: string;
};

export type DonationPreference = {
  recurring: boolean;
  amount: string;
  nonprofit: string;
  applyTo: "Bookings" | "Payouts" | "Both";
};

export type ServiceFeeMode = "single" | "split";

export type FinancialSettingsState = {
  paymentMethods: SavedPaymentMethod[];
  giftCredits: GiftCredit[];
  coupons: Coupon[];
  payoutMethods: PayoutMethod[];
  taxpayer: TaxpayerInfo | null;
  vat: VatInfo | null;
  donationPreference: DonationPreference;
  serviceFeeMode: ServiceFeeMode;
};

export const defaultDonationPreference: DonationPreference = {
  recurring: false,
  amount: "50",
  nonprofit: "StayPrimePH Open Doors Fund",
  applyTo: "Bookings",
};

export const defaultFinancialSettings: FinancialSettingsState = {
  paymentMethods: [],
  giftCredits: [],
  coupons: [],
  payoutMethods: [],
  taxpayer: null,
  vat: null,
  donationPreference: defaultDonationPreference,
  serviceFeeMode: "split",
};
