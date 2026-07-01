import { HostingShell } from "@/components/host/hosting-shell";
import { HostCalendar } from "@/components/host/host-calendar";
import {
  blockHostAvailability,
  deleteHostRateAdjustment,
  removeHostAvailabilityBlock,
  saveMonthlyHostRate,
  saveSelectedDateHostRate,
  setHostRateAdjustmentActive,
} from "@/app/host/calendar/actions";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getCsrfToken } from "@/lib/csrf";
import { getPropertiesForHost } from "@/lib/properties";
import { getUsers } from "@/lib/users";

export default async function HostCalendarPage() {
  return <HostCalendarScreen />;
}

export async function HostCalendarScreen({ active = "Calendar" }: { active?: string }) {
  const user = await getCurrentUser();
  const [bookings, hostListings, users, availabilityBlocks, csrfToken] = await Promise.all([
    getBookings(),
    user ? getPropertiesForHost(user.id) : Promise.resolve([]),
    getUsers(),
    getAvailabilityBlocks(),
    getCsrfToken(),
  ]);
  const visibleListingIds = new Set(hostListings.map((property) => property.id));
  const hostBookings = bookings
    .filter((booking) => booking.hostId === user?.id && visibleListingIds.has(booking.propertyId))
    .map((booking) => {
      const property = hostListings.find((item) => item.id === booking.propertyId);
      const guest = users.find((item) => item.id === booking.guestId);

      return {
        id: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: property?.title ?? "Property",
        bookingPackageName: booking.bookingPackageName,
        guestName: guest?.name ?? "Guest",
        guestAvatar: guest?.avatar ?? "G",
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalPrice: booking.totalPrice,
      };
    });

  return (
    <HostingShell active={active}>
      <HostCalendar
        listings={hostListings.map((property) => ({
          id: property.id,
          title: property.title,
          city: property.city,
          country: property.country,
          pricePerNight: property.pricePerNight,
          weekendPrice: property.weekendPrice,
          holidayPrice: property.holidayPrice,
          holidayDates: property.holidayDates,
          seasonalRates: property.seasonalRates,
          rateAdjustments: property.rateAdjustments,
          status: property.status,
        }))}
        bookings={hostBookings}
        availabilityBlocks={availabilityBlocks
          .filter((block) => hostListings.some((property) => property.id === block.propertyId))
          .map((block) => ({
            id: block.id,
            propertyId: block.propertyId,
            propertyTitle: hostListings.find((property) => property.id === block.propertyId)?.title ?? "Property",
            date: block.date,
            reason: block.reason,
            note: block.note,
          }))}
        blockAvailabilityAction={blockHostAvailability}
        csrfToken={csrfToken}
        removeAvailabilityBlockAction={removeHostAvailabilityBlock}
        saveMonthlyRateAction={saveMonthlyHostRate}
        saveSelectedDateRateAction={saveSelectedDateHostRate}
        setRateAdjustmentActiveAction={setHostRateAdjustmentActive}
        deleteRateAdjustmentAction={deleteHostRateAdjustment}
      />
    </HostingShell>
  );
}
