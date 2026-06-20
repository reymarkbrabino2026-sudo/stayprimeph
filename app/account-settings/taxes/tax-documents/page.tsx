import Link from "next/link";
import { redirect } from "next/navigation";
import { TaxDocumentSettings, type TaxDocumentRecord } from "@/components/account/tax-document-settings";
import { AccountSettingsShell, SettingsTabs } from "@/components/account/settings-shell";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getPayments } from "@/lib/payments";
import { getProperties } from "@/lib/properties";
import { calculateHostPayoutFromTotal } from "@/lib/pricing";

export default async function TaxDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [payments, bookings, properties] = await Promise.all([
    getPayments(),
    getBookings(),
    getProperties(),
  ]);
  const records = buildTaxDocuments({ userId: user.id, payments, bookings, properties });
  const years = documentYears(records);

  return (
    <AccountSettingsShell active="Taxes">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">Taxes</h2>
      <SettingsTabs tabs={[{ label: "Taxpayers", href: "/account-settings/taxes" }, { label: "Tax documents", href: "/account-settings/taxes/tax-documents", active: true }]} />
      <TaxDocumentSettings records={records} years={years} />
      <p>For tax documents issued prior to 2022, <Link href="/support" className="font-semibold underline">contact us</Link>.</p>
      <section className="mt-16">
        <h3 className="text-2xl font-semibold">Need help?</h3>
        <p className="mt-2">Get answers to questions about taxes in our <Link href="/support" className="font-semibold underline">guest support desk</Link>.</p>
      </section>
    </AccountSettingsShell>
  );
}

function buildTaxDocuments({
  userId,
  payments,
  bookings,
  properties,
}: {
  userId: string;
  payments: Awaited<ReturnType<typeof getPayments>>;
  bookings: Awaited<ReturnType<typeof getBookings>>;
  properties: Awaited<ReturnType<typeof getProperties>>;
}): TaxDocumentRecord[] {
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  return payments
    .filter((payment) => payment.paymentStatus === "paid" || payment.paymentStatus === "refunded")
    .flatMap((payment) => {
      const booking = bookingById.get(payment.bookingId);
      if (!booking) return [];
      const property = propertyById.get(booking.propertyId);
      const issuedAt = payment.confirmedAt ?? payment.updatedAt ?? payment.createdAt;
      const date = new Date(issuedAt);
      const base = {
        year: date.getFullYear(),
        month: String(date.getMonth() + 1).padStart(2, "0"),
        issuedAt,
        status: payment.paymentStatus === "refunded" ? "Refunded" : "Issued",
      };
      const records: TaxDocumentRecord[] = [];

      if (booking.guestId === userId || payment.guestId === userId) {
        records.push({
          ...base,
          id: `TAX-GUEST-${payment.id}`,
          description: `Guest invoice - ${property?.title ?? "StayPrimePH booking"}`,
          amount: payment.amount,
        });
      }

      if (booking.hostId === userId || payment.hostId === userId) {
        records.push({
          ...base,
          id: `TAX-HOST-${payment.id}`,
          description: `Host payout statement - ${property?.title ?? "StayPrimePH booking"}`,
          amount: calculateHostPayoutFromTotal(payment.amount),
        });
      }

      return records;
    })
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

function documentYears(records: TaxDocumentRecord[]) {
  const currentYear = new Date().getFullYear();
  const recordYears = records.map((record) => record.year);
  const firstYear = Math.min(currentYear, 2022, ...recordYears);
  const years: number[] = [];
  for (let year = currentYear; year >= firstYear; year -= 1) years.push(year);
  return years;
}
