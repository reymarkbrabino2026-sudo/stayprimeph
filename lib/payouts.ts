import "server-only";

import { randomUUID } from "node:crypto";
import { getBookingsForHost } from "@/lib/bookings";
import { getPaymentsForHost } from "@/lib/payments";
import { readStoredPayouts, writeStoredPayouts } from "@/lib/payout-store";
import { calculateHostPayoutFromTotal, calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { getUsers } from "@/lib/users";
import {
  createPayoutInDatabase,
  getAllPayoutsFromDatabase,
  getPayoutsForHostFromDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Booking, Payment, Payout } from "@/lib/types";

// Host payouts are transaction-based. Once StayPrimePH receives and approves a
// guest payment, the host share should be sent as soon as possible, with 24h as
// the operational target.
const PAYOUT_TARGET_HOURS = 24;

function isPaidPayment(payment?: Payment | null): payment is Payment {
  return payment?.paymentStatus === "paid";
}

function receivedAtForPayout(booking: Booking, payment?: Payment | null): Date {
  const receivedAt = payment?.confirmedAt ?? payment?.updatedAt ?? payment?.createdAt ?? booking.createdAt;
  const parsed = new Date(receivedAt);
  if (Number.isFinite(parsed.getTime())) return parsed;
  return new Date(`${booking.createdAt}T00:00:00.000Z`);
}

export function bookingHostShare(booking: Booking, payment?: Payment | null): number {
  if (booking.status === "cancelled") return 0;
  if (isPaidPayment(payment)) return calculateHostPayoutFromTotal(payment.amount);
  if (booking.paymentStatus !== "paid") return 0;
  return calculateHostPayoutFromTotal(booking.totalPrice);
}

export function payoutAvailableOn(booking: Booking, payment?: Payment | null): Date {
  return receivedAtForPayout(booking, payment);
}

export function payoutTargetBy(booking: Booking, payment?: Payment | null): Date {
  return new Date(receivedAtForPayout(booking, payment).getTime() + PAYOUT_TARGET_HOURS * 60 * 60 * 1000);
}

export function isEarningAvailable(booking: Booking, payment?: Payment | null, now = new Date()): boolean {
  return bookingHostShare(booking, payment) > 0 && now.getTime() >= payoutAvailableOn(booking, payment).getTime();
}

export async function getPayoutsForHost(hostId: string): Promise<Payout[]> {
  if (usesPrismaPersistence()) return getPayoutsForHostFromDatabase(hostId);
  const payouts = await readStoredPayouts();
  return payouts.filter((payout) => payout.hostId === hostId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllPayouts(): Promise<Payout[]> {
  if (usesPrismaPersistence()) return getAllPayoutsFromDatabase();
  return [...(await readStoredPayouts())].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type HostEarningsSummary = {
  lifetimeEarnings: number;
  availableNow: number;
  pendingClearance: number;
  totalPaidOut: number;
  availableBalance: number;
  payouts: Payout[];
};

export type HostPayoutTransaction = {
  id: string;
  hostId: string;
  bookingId: string;
  paymentId?: string;
  transactionId?: string;
  guestPaidTotal: number;
  stayprimeMarkup: number;
  hostPayout: number;
  receivedAt: string;
  availableOn: string;
  targetPayoutBy: string;
  status: "available" | "clearing";
  paidOut: boolean;
  payoutId?: string;
};

function paidPayoutForBooking(payouts: Payout[]) {
  return new Map(
    payouts
      .filter((payout) => payout.status === "paid" && payout.bookingId)
      .map((payout) => [payout.bookingId as string, payout]),
  );
}

function legacyPaidPayoutTotal(payouts: Payout[]) {
  return payouts
    .filter((payout) => payout.status === "paid" && !payout.bookingId)
    .reduce((sum, payout) => sum + payout.amount, 0);
}

async function listHostPayoutTransactions(hostId: string, now = new Date()): Promise<HostPayoutTransaction[]> {
  const [bookings, payments, payouts] = await Promise.all([
    getBookingsForHost(hostId),
    getPaymentsForHost(hostId),
    getPayoutsForHost(hostId),
  ]);
  const paymentsByBooking = new Map(payments.map((payment) => [payment.bookingId, payment]));
  const payoutsByBooking = paidPayoutForBooking(payouts);
  let unlinkedPaidTotal = legacyPaidPayoutTotal(payouts);

  return bookings
    .map((booking) => {
      const payment = paymentsByBooking.get(booking.id);
      const hostPayout = bookingHostShare(booking, payment);
      if (hostPayout <= 0) return null;

      const guestPaidTotal = isPaidPayment(payment) ? payment.amount : booking.totalPrice;
      const linkedPayout = payoutsByBooking.get(booking.id);
      let paidOut = Boolean(linkedPayout);
      if (!paidOut && unlinkedPaidTotal >= hostPayout) {
        paidOut = true;
        unlinkedPaidTotal -= hostPayout;
      }

      const availableOn = payoutAvailableOn(booking, payment);
      const targetPayoutBy = payoutTargetBy(booking, payment);
      const receivedAt = receivedAtForPayout(booking, payment);

      const transaction: HostPayoutTransaction = {
        id: payment?.id ?? booking.id,
        hostId,
        bookingId: booking.id,
        guestPaidTotal,
        stayprimeMarkup: calculateStayprimeMarkupFromTotal(guestPaidTotal),
        hostPayout,
        receivedAt: receivedAt.toISOString(),
        availableOn: availableOn.toISOString(),
        targetPayoutBy: targetPayoutBy.toISOString(),
        status: now.getTime() >= availableOn.getTime() ? "available" as const : "clearing" as const,
        paidOut,
      };
      if (payment?.id) transaction.paymentId = payment.id;
      if (payment?.transactionId) transaction.transactionId = payment.transactionId;
      if (linkedPayout?.id) transaction.payoutId = linkedPayout.id;
      return transaction;
    })
    .filter((transaction): transaction is HostPayoutTransaction => transaction !== null)
    .sort((a, b) => a.availableOn.localeCompare(b.availableOn) || a.bookingId.localeCompare(b.bookingId));
}

export async function getHostPayoutTransactions(hostId: string): Promise<HostPayoutTransaction[]> {
  return listHostPayoutTransactions(hostId);
}

export async function getHostEarningsSummary(hostId: string): Promise<HostEarningsSummary> {
  const [transactions, payouts] = await Promise.all([listHostPayoutTransactions(hostId), getPayoutsForHost(hostId)]);
  const now = new Date();
  const lifetimeEarnings = transactions.reduce((sum, transaction) => sum + transaction.hostPayout, 0);
  const availableNow = transactions
    .filter((transaction) => now.getTime() >= new Date(transaction.availableOn).getTime())
    .reduce((sum, transaction) => sum + transaction.hostPayout, 0);
  const availableBalance = transactions
    .filter((transaction) => !transaction.paidOut && transaction.status === "available")
    .reduce((sum, transaction) => sum + transaction.hostPayout, 0);
  const pendingClearance = transactions
    .filter((transaction) => !transaction.paidOut && transaction.status === "clearing")
    .reduce((sum, transaction) => sum + transaction.hostPayout, 0);
  const totalPaidOut = payouts.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + payout.amount, 0);

  return { lifetimeEarnings, availableNow, pendingClearance, totalPaidOut, availableBalance, payouts };
}

export async function recordHostPayout(hostId: string, amount: number, transaction?: { bookingId?: string; paymentId?: string }): Promise<Payout> {
  const roundedAmount = Math.round(amount);
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) throw new Error("Payout amount must be greater than zero.");

  let bookingId: string | undefined;
  let paymentId: string | undefined;
  let availableOn = new Date().toISOString();

  if (transaction?.bookingId) {
    const payoutTransaction = (await listHostPayoutTransactions(hostId))
      .find((item) => item.bookingId === transaction.bookingId && (!transaction.paymentId || item.paymentId === transaction.paymentId));

    if (!payoutTransaction) throw new Error("Payout transaction was not found.");
    if (payoutTransaction.paidOut) throw new Error("This booking transaction was already paid out.");
    if (payoutTransaction.status !== "available") throw new Error("This payout transaction is still clearing.");
    if (roundedAmount !== payoutTransaction.hostPayout) throw new Error("Payout amount must match this booking transaction.");

    bookingId = payoutTransaction.bookingId;
    paymentId = payoutTransaction.paymentId;
    availableOn = payoutTransaction.availableOn;
  } else {
    const summary = await getHostEarningsSummary(hostId);
    if (roundedAmount > summary.availableBalance) throw new Error("Payout exceeds the host's available balance.");
  }

  const now = new Date();
  const payout: Payout = {
    id: randomUUID(),
    hostId,
    bookingId,
    paymentId,
    amount: roundedAmount,
    status: "paid",
    availableOn,
    createdAt: now.toISOString(),
  };

  if (usesPrismaPersistence()) {
    await createPayoutInDatabase(payout);
  } else {
    await writeStoredPayouts([payout, ...(await readStoredPayouts())]);
  }
  return payout;
}

export type HostPayoutQueueEntry = {
  host: { id: string; name: string; email: string };
  bookingId: string;
  paymentId?: string;
  transactionId?: string;
  guestPaidTotal: number;
  stayprimeMarkup: number;
  hostPayout: number;
  receivedAt: string;
  availableOn: string;
  targetPayoutBy: string;
  status: "available" | "clearing";
};

// Booking transactions owed to hosts, for the admin payout queue.
export async function getHostPayoutQueue(): Promise<HostPayoutQueueEntry[]> {
  const hosts = (await getUsers()).filter((user) => user.role === "host");
  const entriesByHost = await Promise.all(
    hosts.map(async (host) => {
      const transactions = await listHostPayoutTransactions(host.id);
      return transactions
        .filter((transaction) => !transaction.paidOut)
        .map((transaction) => {
          const entry: HostPayoutQueueEntry = {
            host: { id: host.id, name: host.name, email: host.email },
            bookingId: transaction.bookingId,
            guestPaidTotal: transaction.guestPaidTotal,
            stayprimeMarkup: transaction.stayprimeMarkup,
            hostPayout: transaction.hostPayout,
            receivedAt: transaction.receivedAt,
            availableOn: transaction.availableOn,
            targetPayoutBy: transaction.targetPayoutBy,
            status: transaction.status,
          };
          if (transaction.paymentId) entry.paymentId = transaction.paymentId;
          if (transaction.transactionId) entry.transactionId = transaction.transactionId;
          return entry;
        });
    }),
  );
  return entriesByHost
    .flat()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "available" ? -1 : 1;
      return a.availableOn.localeCompare(b.availableOn) || b.hostPayout - a.hostPayout;
    });
}
