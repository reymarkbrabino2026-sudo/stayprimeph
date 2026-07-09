"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAvailabilityBlocks } from "@/lib/availability";
import { hasAvailabilityBlockConflict } from "@/lib/availability-calendar";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getBookings, getBookingsForHost, hasDateConflict } from "@/lib/bookings";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { saveHostCustomerClassification } from "@/lib/host-customer-store";
import { archiveLead, createLead, readLeads, replaceLead } from "@/lib/lead-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { assertUniquePaymentReference } from "@/lib/payment-references";
import { allowsPackageBooking, allowsStayBooking } from "@/lib/pricing";
import { getProperties } from "@/lib/properties";
import {
  createBookingInDatabase,
  createUserInDatabase,
  listPaymentsFromDatabase,
  recordManualPaymentInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import type { Booking, HostCustomerClassification, Lead, LeadPriority, LeadStatus, Payment, PaymentMethod, Property, User } from "@/lib/types";
import { getUsers } from "@/lib/users";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";

function isIsoDate(value: string) {
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

function dateTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function localGuestEmail(id: string) {
  return `external-${id}@stayprimeph.local`;
}

function findEnabledPackage(property: Property, packageId?: string) {
  const enabledPackages = property.bookingPackages?.filter((item) => item.enabled && item.status !== "inactive") ?? [];
  if (!packageId) return enabledPackages[0];
  return enabledPackages.find((item) => item.id === packageId);
}

async function getOrCreateExternalGuest({
  email,
  name,
  phone,
}: {
  email?: string;
  name: string;
  phone?: string;
}) {
  const normalizedEmail = email?.trim().toLowerCase();
  const users = await getUsers();
  const existing = normalizedEmail ? users.find((user) => user.email.toLowerCase() === normalizedEmail) : null;
  if (existing) return existing;

  const id = randomUUID();
  const user: User = {
    id,
    name,
    email: normalizedEmail || localGuestEmail(id),
    role: "guest",
    avatar: "",
    phone: phone ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
    emailVerifiedAt: normalizedEmail ? new Date().toISOString() : undefined,
  };

  if (usesPrismaPersistence()) {
    await createUserInDatabase(user);
  } else {
    const storedUsers = await readStoredUsers();
    await writeStoredUsers([user, ...storedUsers]);
  }

  return user;
}

const externalReservationSchema = z.object({
  propertyId: z.string().trim().min(1, "Choose a listing."),
  bookingPackageId: z.string().trim().optional(),
  guestName: z.string().trim().min(2, "Enter the guest name.").max(120),
  guestEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  guestPhone: z.string().trim().max(60).optional(),
  checkIn: z.string().trim().refine(isIsoDate, "Use a valid check-in date."),
  checkOut: z.string().trim().refine(isIsoDate, "Use a valid check-out date."),
  guests: z.coerce.number().int().min(1).max(50),
  totalPrice: z.coerce.number().positive("Enter the outside transaction amount."),
  paymentMethod: z.enum(["gcash", "bank_transfer", "other"]),
  transactionId: z.string().trim().min(2, "Enter a receipt or transaction reference.").max(180),
  notes: z.string().trim().max(500).optional(),
});

const leadStatusValues = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const leadPriorityValues = ["low", "normal", "high", "urgent"] as const;

const optionalLeadDate = z.string().trim().refine((value) => !value || isIsoDate(value), "Use a valid date.");
const optionalLeadInteger = (min: number, max: number) =>
  z.preprocess((value) => {
    const raw = typeof value === "string" ? value.trim() : value;
    return raw === "" || raw === null ? undefined : raw;
  }, z.coerce.number().int().min(min).max(max).optional());

const leadFormSchema = z.object({
  id: z.string().trim().optional(),
  hostId: z.string().trim().optional(),
  contactName: z.string().trim().min(2, "Enter the lead contact name.").max(120),
  contactEmail: z.string().trim().max(160).refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email."),
  contactPhone: z.string().trim().max(60),
  companyOrGroup: z.string().trim().max(120),
  source: z.string().trim().max(80),
  preferredPropertyId: z.string().trim(),
  checkIn: optionalLeadDate,
  checkOut: optionalLeadDate,
  guests: optionalLeadInteger(1, 100),
  estimatedValue: optionalLeadInteger(1, 50_000_000),
  status: z.enum(leadStatusValues),
  priority: z.enum(leadPriorityValues),
  notes: z.string().trim().max(1000),
  lastContactedAt: optionalLeadDate,
}).superRefine((data, context) => {
  if (data.checkIn && data.checkOut && dateTime(data.checkOut) <= dateTime(data.checkIn)) {
    context.addIssue({
      code: "custom",
      message: "Lead check-out must be after check-in.",
      path: ["checkOut"],
    });
  }
});

const leadStatusSchema = z.object({
  id: z.string().trim().min(1, "Lead not found."),
  status: z.enum(leadStatusValues),
  returnTo: z.string().trim().optional(),
});

const leadArchiveSchema = z.object({
  id: z.string().trim().min(1, "Lead not found."),
  returnTo: z.string().trim().optional(),
});

function customerReturnPath(value: FormDataEntryValue | null) {
  const fallback = "/host/erp/customers";
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/host/erp/customers")) return fallback;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return fallback;
  return trimmed;
}

function leadReturnPath(value: FormDataEntryValue | string | null | undefined) {
  const fallback = "/host/erp/leads";
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/host/erp/leads")) return fallback;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return fallback;
  return trimmed;
}

function normalizeCustomerClassification(value: FormDataEntryValue | null): HostCustomerClassification {
  return value === "vip" ? "vip" : "ordinary";
}

function optionalLeadText(value: string) {
  return value.trim() || undefined;
}

function leadStatusValue(value: FormDataEntryValue | null): LeadStatus {
  return leadStatusValues.includes(value as LeadStatus) ? value as LeadStatus : "new";
}

function leadPriorityValue(value: FormDataEntryValue | null): LeadPriority {
  return leadPriorityValues.includes(value as LeadPriority) ? value as LeadPriority : "normal";
}

function revalidateLeadPaths() {
  revalidatePath("/host/erp");
  revalidatePath("/host/erp/leads");
  revalidatePath("/admin/erp");
}

async function resolveLeadHostId(user: User, submittedHostId: string | undefined) {
  if (user.role !== "admin") return user.id;

  const hostId = submittedHostId?.trim();
  if (!hostId) throw new Error("Choose the host that owns this lead.");

  const users = await getUsers();
  const host = users.find((item) => item.id === hostId && item.role === "host");
  if (!host) throw new Error("Choose a valid host for this lead.");
  return host.id;
}

async function assertLeadPropertyBelongsToHost(propertyId: string | undefined, hostId: string) {
  if (!propertyId) return;

  const properties = await getProperties();
  const property = properties.find((item) => item.id === propertyId);
  if (!property || property.hostId !== hostId) throw new Error("Choose a listing owned by the selected host.");
}

async function findAccessibleLead(user: User, leadId: string) {
  const leads = await readLeads(user.role === "admin" ? undefined : user.id);
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) throw new Error("Lead not found.");
  return { lead, leads };
}

export async function createManualLead(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts and admins can create leads." });
  requireVerifiedEmail(user);

  const parsed = leadFormSchema.safeParse({
    hostId: formData.get("hostId"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    companyOrGroup: formData.get("companyOrGroup") ?? "",
    source: formData.get("source") ?? "",
    preferredPropertyId: formData.get("preferredPropertyId") ?? "",
    checkIn: formData.get("checkIn") ?? "",
    checkOut: formData.get("checkOut") ?? "",
    guests: formData.get("guests") ?? "",
    estimatedValue: formData.get("estimatedValue") ?? "",
    status: leadStatusValue(formData.get("status")),
    priority: leadPriorityValue(formData.get("priority")),
    notes: formData.get("notes") ?? "",
    lastContactedAt: formData.get("lastContactedAt") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please complete the lead form.");

  const data = parsed.data;
  const hostId = await resolveLeadHostId(user, data.hostId);
  const preferredPropertyId = optionalLeadText(data.preferredPropertyId);
  await assertLeadPropertyBelongsToHost(preferredPropertyId, hostId);

  const now = new Date().toISOString();
  const hostLeads = await readLeads(hostId);
  const lead: Lead = {
    id: randomUUID(),
    hostId,
    contactName: data.contactName,
    contactEmail: optionalLeadText(data.contactEmail),
    contactPhone: optionalLeadText(data.contactPhone),
    companyOrGroup: optionalLeadText(data.companyOrGroup),
    source: optionalLeadText(data.source),
    preferredPropertyId,
    checkIn: optionalLeadText(data.checkIn),
    checkOut: optionalLeadText(data.checkOut),
    guests: data.guests,
    estimatedValue: data.estimatedValue,
    status: data.status,
    priority: data.priority,
    notes: optionalLeadText(data.notes),
    lastContactedAt: optionalLeadText(data.lastContactedAt),
    displayOrder: hostLeads.filter((item) => item.status === data.status).length,
    createdAt: now,
    updatedAt: now,
  };

  await createLead(lead);
  revalidateLeadPaths();
  redirect(leadReturnPath(formData.get("returnTo")));
}

export async function updateManualLead(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts and admins can update leads." });
  requireVerifiedEmail(user);

  const parsed = leadFormSchema.safeParse({
    id: formData.get("id"),
    hostId: formData.get("hostId"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    companyOrGroup: formData.get("companyOrGroup") ?? "",
    source: formData.get("source") ?? "",
    preferredPropertyId: formData.get("preferredPropertyId") ?? "",
    checkIn: formData.get("checkIn") ?? "",
    checkOut: formData.get("checkOut") ?? "",
    guests: formData.get("guests") ?? "",
    estimatedValue: formData.get("estimatedValue") ?? "",
    status: leadStatusValue(formData.get("status")),
    priority: leadPriorityValue(formData.get("priority")),
    notes: formData.get("notes") ?? "",
    lastContactedAt: formData.get("lastContactedAt") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please complete the lead form.");
  const leadId = parsed.data.id;
  if (!leadId) throw new Error("Lead not found.");

  const data = parsed.data;
  const { lead: existing } = await findAccessibleLead(user, leadId);
  const hostId = await resolveLeadHostId(user, data.hostId || existing.hostId);
  const preferredPropertyId = optionalLeadText(data.preferredPropertyId);
  await assertLeadPropertyBelongsToHost(preferredPropertyId, hostId);

  await replaceLead({
    ...existing,
    hostId,
    contactName: data.contactName,
    contactEmail: optionalLeadText(data.contactEmail),
    contactPhone: optionalLeadText(data.contactPhone),
    companyOrGroup: optionalLeadText(data.companyOrGroup),
    source: optionalLeadText(data.source),
    preferredPropertyId,
    checkIn: optionalLeadText(data.checkIn),
    checkOut: optionalLeadText(data.checkOut),
    guests: data.guests,
    estimatedValue: data.estimatedValue,
    status: data.status,
    priority: data.priority,
    notes: optionalLeadText(data.notes),
    lastContactedAt: optionalLeadText(data.lastContactedAt),
    updatedAt: new Date().toISOString(),
  });

  revalidateLeadPaths();
  redirect(leadReturnPath(formData.get("returnTo")));
}

export async function updateLeadStatus(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts and admins can update leads." });
  requireVerifiedEmail(user);

  const parsed = leadStatusSchema.safeParse({
    id: formData.get("id"),
    status: leadStatusValue(formData.get("status")),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Lead not found.");

  const { lead, leads } = await findAccessibleLead(user, parsed.data.id);
  const movedToContacted = parsed.data.status === "contacted" && lead.status !== "contacted";
  await replaceLead({
    ...lead,
    status: parsed.data.status,
    displayOrder: lead.status === parsed.data.status ? lead.displayOrder : leads.filter((item) => item.hostId === lead.hostId && item.status === parsed.data.status).length,
    lastContactedAt: movedToContacted && !lead.lastContactedAt ? new Date().toISOString().slice(0, 10) : lead.lastContactedAt,
    updatedAt: new Date().toISOString(),
  });

  revalidateLeadPaths();
  redirect(leadReturnPath(parsed.data.returnTo));
}

export async function archiveManualLead(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts and admins can archive leads." });
  requireVerifiedEmail(user);

  const parsed = leadArchiveSchema.safeParse({
    id: formData.get("id"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Lead not found.");

  await findAccessibleLead(user, parsed.data.id);
  await archiveLead(parsed.data.id, new Date().toISOString());
  revalidateLeadPaths();
  redirect(leadReturnPath(parsed.data.returnTo));
}

export async function updateCustomerClassification(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts and admins can update customer types." });
  requireVerifiedEmail(user);

  const guestId = String(formData.get("guestId") ?? "").trim();
  const submittedHostId = String(formData.get("hostId") ?? "").trim();
  const hostId = user.role === "admin" ? submittedHostId : user.id;
  const classification = normalizeCustomerClassification(formData.get("classification"));
  const returnTo = customerReturnPath(formData.get("returnTo"));

  if (!guestId || !hostId) throw new Error("Customer not found.");

  const bookings = user.role === "admin" ? await getBookings() : await getBookingsForHost(user.id);
  const customerBelongsToHost = bookings.some((booking) => booking.hostId === hostId && booking.guestId === guestId);
  if (!customerBelongsToHost) throw new Error("Customer not found for this host.");

  await saveHostCustomerClassification({ hostId, guestId, classification });

  revalidatePath("/host/erp");
  revalidatePath("/host/erp/customers");
  redirect(returnTo);
}

export async function createExternalReservation(formData: FormData) {
  await assertTrustedRequestOrigin();

  const user = await requireRole(["host", "admin"], { forbiddenMessage: "Only hosts can create external reservations." });
  requireVerifiedEmail(user);

  const parsed = externalReservationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    bookingPackageId: formData.get("bookingPackageId") || undefined,
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail") || undefined,
    guestPhone: formData.get("guestPhone") || undefined,
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    guests: formData.get("guests"),
    totalPrice: formData.get("totalPrice"),
    paymentMethod: formData.get("paymentMethod"),
    transactionId: formData.get("transactionId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please complete the reservation form.");

  const data = parsed.data;
  const [properties, bookings, availabilityBlocks] = await Promise.all([getProperties(), getBookings(), getAvailabilityBlocks()]);
  const isAdmin = user.role === "admin";
  const property = properties.find((item) => item.id === data.propertyId && (isAdmin || item.hostId === user.id));
  if (!property) throw new Error("Listing not found.");
  if (property.status !== "approved") throw new Error("Only approved listings can receive reservations.");

  const requestedPackageId = data.bookingPackageId?.trim();
  const stayBookingAllowed = allowsStayBooking(property);
  const packageBookingAllowed = allowsPackageBooking(property);
  const bookingPackage = packageBookingAllowed
    ? requestedPackageId ? findEnabledPackage(property, requestedPackageId) : stayBookingAllowed ? undefined : findEnabledPackage(property)
    : undefined;
  if (requestedPackageId && !bookingPackage) throw new Error("Selected booking package does not belong to this listing.");
  if (!bookingPackage && !stayBookingAllowed) throw new Error("This listing requires a booking package.");
  const maxGuests = bookingPackage?.maxGuests ?? property.maxGuests;
  if (data.guests > maxGuests) throw new Error("Guest count exceeds this listing capacity.");
  if (dateTime(data.checkOut) <= dateTime(data.checkIn)) throw new Error("Check-out must be after check-in.");
  if (hasDateConflict(bookings, data.propertyId, data.checkIn, data.checkOut, bookingPackage?.id, property.bookingPackages ?? [])) throw new Error("Those dates are already booked.");
  if (hasAvailabilityBlockConflict(availabilityBlocks, data.propertyId, data.checkIn, data.checkOut)) throw new Error("Those dates are blocked on the calendar.");

  const guest = await getOrCreateExternalGuest({
    email: data.guestEmail || undefined,
    name: data.guestName,
    phone: data.guestPhone,
  });
  const now = new Date().toISOString();
  const booking: Booking = {
    id: randomUUID(),
    propertyId: property.id,
    guestId: guest.id,
    hostId: property.hostId,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    guests: data.guests,
    totalPrice: Math.round(data.totalPrice),
    status: "pending",
    paymentStatus: "submitted",
    createdAt: now.slice(0, 10),
    bookingPackageId: bookingPackage?.id,
    bookingPackageName: bookingPackage?.name,
    bookingPackageUnit: bookingPackage?.unit,
  };
  const payment: Payment = {
    id: `payment-${booking.id}`,
    bookingId: booking.id,
    guestId: guest.id,
    hostId: property.hostId,
    amount: booking.totalPrice,
    paymentMethod: data.paymentMethod as PaymentMethod,
    paymentStatus: "submitted",
    transactionId: data.transactionId,
    notes: data.notes ? `External reservation: ${data.notes}` : "External reservation recorded by host.",
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (usesPrismaPersistence()) {
    const latestPayments = await listPaymentsFromDatabase();
    assertUniquePaymentReference(latestPayments, {
      bookingId: booking.id,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    });
    await createBookingInDatabase(booking);
    await recordManualPaymentInDatabase(booking, {
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      notes: payment.notes,
    });
  } else {
    const [latestBookings, latestBlocks, latestPayments] = await Promise.all([readStoredBookings(), getAvailabilityBlocks(), readStoredPayments()]);
    if (hasDateConflict(latestBookings, data.propertyId, data.checkIn, data.checkOut, bookingPackage?.id, property.bookingPackages ?? [])) throw new Error("Those dates are already booked.");
    if (hasAvailabilityBlockConflict(latestBlocks, data.propertyId, data.checkIn, data.checkOut)) throw new Error("Those dates are blocked on the calendar.");
    assertUniquePaymentReference(latestPayments, {
      bookingId: booking.id,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    });
    await writeStoredBookings([booking, ...latestBookings]);
    await writeStoredPayments([payment, ...latestPayments.filter((item) => item.bookingId !== booking.id)]);
  }

  revalidatePath("/host/erp");
  revalidatePath("/host/erp/reservations");
  revalidatePath("/host/bookings");
  revalidatePath("/host/calendar");
  revalidatePath("/host/reports");
  revalidatePath("/admin/bookings");
  revalidatePath(`/rooms/${property.id}`);
  revalidatePath(`/properties/${property.id}`);
  revalidatePath(`/property/${property.slug}`);
  revalidatePath("/search");
  redirect(`/host/erp/reservations?month=${data.checkIn.slice(0, 7)}&status=pending`);
}
