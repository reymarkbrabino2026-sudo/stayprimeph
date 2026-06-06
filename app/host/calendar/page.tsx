import { HostingShell } from "@/components/host/hosting-shell";
import { HostCalendar } from "@/components/host/host-calendar";
import { getCurrentUser } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";
import { getProperties } from "@/lib/properties";
import { getUsers } from "@/lib/users";

export default async function HostCalendarPage() {
  const user = await getCurrentUser();
  const [bookings, properties, users] = await Promise.all([getBookings(), getProperties(), getUsers()]);
  const hostListings = properties.filter((property) => property.hostId === user?.id);
  const hostBookings = bookings
    .filter((booking) => booking.hostId === user?.id)
    .map((booking) => {
      const property = properties.find((item) => item.id === booking.propertyId);
      const guest = users.find((item) => item.id === booking.guestId);

      return {
        id: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: property?.title ?? "Property",
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
    <HostingShell active="Calendar">
      <HostCalendar
        listings={hostListings.map((property) => ({
          id: property.id,
          title: property.title,
          city: property.city,
          country: property.country,
          pricePerNight: property.pricePerNight,
          status: property.status,
        }))}
        bookings={hostBookings}
      />
    </HostingShell>
  );
}
