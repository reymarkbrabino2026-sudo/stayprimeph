export type UserRole = "guest" | "host" | "admin";
export type ListingStatus = "approved" | "pending" | "rejected";
export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed";
export type PaymentMethod = "stripe" | "gcash" | "bank_transfer" | "other";
export type PaymentStatus = "paid" | "pending" | "submitted" | "rejected" | "refunded";
export type AvailabilityBlockReason = "booked_elsewhere" | "owner_use" | "maintenance" | "other";

export interface User { id: string; name: string; email: string; role: UserRole; avatar: string; phone: string; createdAt: string; passwordHash?: string; emailVerifiedAt?: string; }
export interface PropertyImage { id: string; propertyId: string; imageUrl: string; tone: string; }
export interface ListingDiscounts { newListing: boolean; lastMinute: boolean; weekly: boolean; monthly: boolean; }
export interface Property { id: string; hostId: string; slug: string; title: string; description: string; address: string; city: string; country: string; pricePerNight: number; weekendPrice?: number; cleaningFee?: number; securityDeposit?: number; currency?: string; bedrooms: number; bathrooms: number; maxGuests: number; propertyType: string; status: ListingStatus; rating: number; amenities: string[]; rules: string[]; createdAt: string; images: PropertyImage[]; discounts?: ListingDiscounts; latitude?: number; longitude?: number; barangay?: string; province?: string; zipCode?: string; preciseLocation?: boolean; }
export interface Booking { id: string; propertyId: string; guestId: string; hostId: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; status: BookingStatus; paymentStatus: PaymentStatus; createdAt: string; }
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
export interface HostMonthlyReport {
  id: string;
  hostId: string;
  month: string;
  salesAmount: number;
  expensesAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface AuthToken { id: string; userId: string; tokenHash: string; type: "email_verification" | "password_reset"; expiresAt: string; createdAt: string; }
export interface Cancellation { id: string; bookingId: string; propertyId: string; reason?: string; status: string; createdAt: string; }
export interface Report { id: string; propertyId?: string; reporterId?: string; type: string; status: string; details: string; createdAt: string; }
export interface Dispute { id: string; bookingId?: string; propertyId?: string; reason: string; status: string; createdAt: string; }
