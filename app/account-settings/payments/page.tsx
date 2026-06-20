import { CircleDollarSign } from "lucide-react";
import { redirect } from "next/navigation";
import { PaymentSettings, type PaymentHistoryRecord } from "@/components/account/payment-settings";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getPayments } from "@/lib/payments";
import { getProperties } from "@/lib/properties";
import type { PaymentStatus } from "@/lib/types";

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [accountSettings, payments, bookings, properties] = await Promise.all([
    getAccountSettings(user),
    getPayments(),
    getBookings(),
    getProperties(),
  ]);
  const paymentHistory = buildPaymentHistory({
    userId: user.id,
    payments,
    bookings,
    properties,
  });

  return (
    <AccountSettingsShell active="Payments">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Payments</h2>
      <PaymentTabs active="Payments" />
      <PaymentSettings initialFinancial={accountSettings.financial} paymentHistory={paymentHistory} requiresStepUp={user.role === "host"} />
      <div className="mt-8 flex gap-5 rounded-2xl border border-black/15 p-6"><CircleDollarSign className="text-[#083f35]" /><p><strong>Make all payments through StayPrimePH</strong><br /><span className="text-sm text-black/65">Always pay and communicate through StayPrimePH to ensure you&apos;re protected under our terms and safeguards.</span></p></div>
    </AccountSettingsShell>
  );
}

function buildPaymentHistory({
  userId,
  payments,
  bookings,
  properties,
}: {
  userId: string;
  payments: Awaited<ReturnType<typeof getPayments>>;
  bookings: Awaited<ReturnType<typeof getBookings>>;
  properties: Awaited<ReturnType<typeof getProperties>>;
}): PaymentHistoryRecord[] {
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  return payments
    .filter((payment) => {
      const booking = bookingById.get(payment.bookingId);
      return payment.guestId === userId || booking?.guestId === userId;
    })
    .map((payment) => {
      const booking = bookingById.get(payment.bookingId);
      const property = booking ? propertyById.get(booking.propertyId) : null;
      return {
        id: payment.transactionId || payment.id,
        date: payment.confirmedAt ?? payment.submittedAt ?? payment.updatedAt ?? payment.createdAt,
        description: property?.title ?? booking?.bookingPackageName ?? "StayPrimePH booking",
        amount: payment.amount,
        status: paymentStatusLabel(payment.paymentStatus),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "paid") return "Paid";
  if (status === "refunded") return "Refunded";
  if (status === "submitted") return "Submitted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function PaymentTabs({ active }: { active: string }) {
  return <SettingsTabs tabs={[{ label: "Payments", href: "/account-settings/payments", active: active === "Payments" }, { label: "Payouts", href: "/account-settings/payments/payouts", active: active === "Payouts" }, { label: "Service fee", href: "/account-settings/payments/service-fee", active: active === "Service fee" }, { label: "Donations", href: "/account-settings/payments/donations", active: active === "Donations" }]} />;
}
