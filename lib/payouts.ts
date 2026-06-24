import "server-only";

import { randomUUID } from "node:crypto";
import { getBookingsForHost } from "@/lib/bookings";
import { readStoredPayouts, writeStoredPayouts } from "@/lib/payout-store";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";
import { getUsers } from "@/lib/users";
import {
  createPayoutInDatabase,
  getAllPayoutsFromDatabase,
  getPayoutsForHostFromDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Booking, Payout } from "@/lib/types";

// Host earnings clear 24h after checkout (a small buffer for disputes), per the
// agreed payout policy. StayPrime absorbs payment-provider fees, so the host
// receives the full nightly subtotal (total minus the StayPrime service-fee markup).
const PAYOUT_HOLD_HOURS = 24;

export function bookingHostShare(booking: Booking): number {
  if (booking.paymentStatus !== "paid" || booking.status === "cancelled") return 0;
  return calculateHostPayoutFromTotal(booking.totalPrice);
}

export function payoutAvailableOn(booking: Booking): Date {
  const checkout = new Date(`${booking.checkOut}T00:00:00.000Z`);
  return new Date(checkout.getTime() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000);
}

export function isEarningAvailable(booking: Booking, now = new Date()): boolean {
  return bookingHostShare(booking) > 0 && now.getTime() >= payoutAvailableOn(booking).getTime();
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

export async function getHostEarningsSummary(hostId: string): Promise<HostEarningsSummary> {
  const [bookings, payouts] = await Promise.all([getBookingsForHost(hostId), getPayoutsForHost(hostId)]);
  const now = new Date();

  let lifetimeEarnings = 0;
  let availableNow = 0;
  for (const booking of bookings) {
    const share = bookingHostShare(booking);
    if (share <= 0) continue;
    lifetimeEarnings += share;
    if (isEarningAvailable(booking, now)) availableNow += share;
  }

  const totalPaidOut = payouts.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + payout.amount, 0);
  const availableBalance = Math.max(0, availableNow - totalPaidOut);
  const pendingClearance = Math.max(0, lifetimeEarnings - availableNow);

  return { lifetimeEarnings, availableNow, pendingClearance, totalPaidOut, availableBalance, payouts };
}

export async function recordHostPayout(hostId: string, amount: number): Promise<Payout> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payout amount must be greater than zero.");
  const summary = await getHostEarningsSummary(hostId);
  if (Math.round(amount) > summary.availableBalance) throw new Error("Payout exceeds the host's available balance.");

  const now = new Date();
  const payout: Payout = {
    id: randomUUID(),
    hostId,
    amount: Math.round(amount),
    status: "paid",
    availableOn: now.toISOString(),
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
  availableBalance: number;
  pendingClearance: number;
  totalPaidOut: number;
};

// Hosts who are owed money (available now or still clearing), for the admin payout queue.
export async function getHostPayoutQueue(): Promise<HostPayoutQueueEntry[]> {
  const hosts = (await getUsers()).filter((user) => user.role === "host");
  const entries = await Promise.all(
    hosts.map(async (host) => {
      const summary = await getHostEarningsSummary(host.id);
      return {
        host: { id: host.id, name: host.name, email: host.email },
        availableBalance: summary.availableBalance,
        pendingClearance: summary.pendingClearance,
        totalPaidOut: summary.totalPaidOut,
      };
    }),
  );
  return entries
    .filter((entry) => entry.availableBalance > 0 || entry.pendingClearance > 0)
    .sort((a, b) => b.availableBalance - a.availableBalance);
}
