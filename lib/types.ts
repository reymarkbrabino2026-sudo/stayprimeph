export type UserRole = "guest" | "host" | "admin";
export type ListingStatus = "approved" | "pending" | "rejected" | "draft";
export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed";
export type PaymentMethod = "stripe" | "gcash" | "bank_transfer" | "other";
export type PaymentStatus = "paid" | "partially_paid" | "pending" | "submitted" | "rejected" | "refunded";
export type AvailabilityBlockReason = "booked_elsewhere" | "owner_use" | "maintenance" | "other";

export interface User { id: string; name: string; email: string; role: UserRole; avatar: string; phone: string; createdAt: string; passwordHash?: string; emailVerifiedAt?: string; passwordChangedAt?: string; }
export interface PropertyImage { id: string; propertyId: string; imageUrl: string; tone: string; }
export interface PublicListingSummary {
  id: string;
  slug: string;
  title: string;
  address?: string;
  city: string;
  country: string;
  pricePerNight: number;
  bedrooms: number;
  maxGuests: number;
  propertyType: string;
  amenities: string[];
  rating: number;
  createdAt: string;
  images: PropertyImage[];
  latitude?: number;
  longitude?: number;
  barangay?: string;
  province?: string;
  zipCode?: string;
  preciseLocation?: boolean;
}
export interface ListingDiscounts { newListing: boolean; lastMinute: boolean; weekly: boolean; monthly: boolean; }
export type BookingPackageUnit = "night" | "day";
export interface BookingPackage {
  id: string;
  name: string;
  accessType: string;
  unit: BookingPackageUnit;
  weekdayRate: number;
  weekendRate: number;
  holidayRate?: number;
  includedGuests: number;
  maxGuests: number;
  additionalGuestFee: number;
  extensionHourlyFee: number;
  checkInTime: string;
  checkOutTime: string;
  enabled: boolean;
}
export interface Property { id: string; hostId: string; slug: string; title: string; description: string; address: string; city: string; country: string; pricePerNight: number; weekendPrice?: number; cleaningFee?: number; securityDeposit?: number; currency?: string; bedrooms: number; bathrooms: number; maxGuests: number; propertyType: string; status: ListingStatus; rating: number; amenities: string[]; rules: string[]; createdAt: string; images: PropertyImage[]; discounts?: ListingDiscounts; bookingPackages?: BookingPackage[]; latitude?: number; longitude?: number; barangay?: string; province?: string; zipCode?: string; preciseLocation?: boolean; }
export interface Booking { id: string; propertyId: string; guestId: string; hostId: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; status: BookingStatus; paymentStatus: PaymentStatus; createdAt: string; bookingPackageId?: string; bookingPackageName?: string; bookingPackageUnit?: BookingPackageUnit; }
export interface AvailabilityBlock { id: string; propertyId: string; date: string; reason: AvailabilityBlockReason; note?: string; createdAt: string; }
export interface Review { id: string; propertyId: string; guestId: string; rating: number; comment: string; createdAt: string; bookingId?: string; }
export interface Message { id: string; senderId: string; receiverId: string; bookingId?: string; propertyId?: string; message: string; createdAt: string; }
export interface WishlistItem { id: string; userId: string; propertyId: string; }
export interface Payment {
  id: string;
  bookingId: string;
  guestId?: string;
  hostId?: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus;
  transactionId: string;
  notes?: string;
  rejectionReason?: string;
  confirmedBy?: string;
  submittedAt?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
export interface PlatformLedgerEntry {
  id: string;
  bookingId: string;
  paymentId?: string;
  amount: number;
  source: "manual_payment" | "stripe";
  destination: "stayprime_bank";
  status: "banked";
  createdAt: string;
}
export interface Payout {
  id: string;
  hostId: string;
  amount: number;
  status: "paid" | "pending";
  availableOn: string;
  createdAt: string;
}
export interface HostMonthlyReport {
  id: string;
  hostId: string;
  month: string;
  reportDate?: string;
  salesAmount: number;
  expensesAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface HostExpense {
  id: string;
  hostId: string;
  expenseDate: string;
  month: string;
  category: string;
  amount: number;
  vendor: string;
  description?: string;
  receiptReference?: string;
  createdAt: string;
  updatedAt: string;
}
export interface AuthToken { id: string; userId: string; tokenHash: string; type: "email_verification" | "email_change" | "password_reset" | "admin_mfa" | "account_deletion"; expiresAt: string; createdAt: string; metadata?: Record<string, unknown>; }
export interface AuthSession { id: string; userId: string; sessionHash: string; expiresAt: string; createdAt: string; }
export interface Cancellation { id: string; bookingId: string; propertyId: string; reason?: string; status: string; createdAt: string; }
export type AuditLogAction =
  | "payment.approved"
  | "payment.rejected"
  | "payment.refunded"
  | "booking.cancelled"
  | "listing.approved"
  | "listing.rejected"
  | "account.anonymized"
  | "account.email_changed"
  | "account.password_reset_requested"
  | "account.password_reset_completed"
  | "account.role_changed"
  | "auth.login_failed"
  | "support.replied";
export interface AuditLog { id: string; actorId: string; actorRole: UserRole | "system"; action: AuditLogAction; entityType: string; entityId: string; metadata?: Record<string, unknown>; createdAt: string; }
export interface Report { id: string; propertyId?: string; reporterId?: string; type: string; status: string; details: string; createdAt: string; }
export interface Dispute { id: string; bookingId?: string; propertyId?: string; reason: string; status: string; createdAt: string; }
