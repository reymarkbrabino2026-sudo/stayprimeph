import { redirect } from "next/navigation";
import { BookingPermissionSettings } from "@/components/account/booking-permission-settings";
import { AccountSettingsShell } from "@/components/account/settings-shell";
import { getAccountSettings } from "@/lib/account-settings";
import { defaultBookingPermissions } from "@/lib/account-settings-types";
import { getCurrentUser } from "@/lib/auth";

export default async function BookingPermissionsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login");
  }

  const accountSettings = await getAccountSettings(user);

  return (
    <AccountSettingsShell active="Booking permissions">
      <h2 className="text-[2rem] font-semibold tracking-[-0.04em]">
        Booking permissions
      </h2>

      <p className="mt-3 text-black/65">
        Choose which requirements guests need to meet before they can book or
        request your listing.
      </p>

      <BookingPermissionSettings
        initialSettings={accountSettings.bookingPermissions ?? defaultBookingPermissions}
      />
    </AccountSettingsShell>
  );
}
