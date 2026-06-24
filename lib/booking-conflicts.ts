import type { Booking, BookingPackage } from "@/lib/types";

type PackageConflictBooking = Pick<Booking, "bookingPackageId">;

function packageById(packages: BookingPackage[], packageId?: string | null) {
  if (!packageId) return null;
  return packages.find((item) => item.id === packageId) ?? null;
}

export function bookingPackageConflicts({
  requestedPackageId,
  existingPackageId,
  packages,
}: {
  requestedPackageId?: string | null;
  existingPackageId?: string | null;
  packages: BookingPackage[];
}) {
  if (!requestedPackageId || !existingPackageId) return true;
  if (requestedPackageId === existingPackageId) return true;

  const requestedPackage = packageById(packages, requestedPackageId);
  const existingPackage = packageById(packages, existingPackageId);
  if (!requestedPackage || !existingPackage) return true;

  return (
    (requestedPackage.blockedPackageIds ?? []).includes(existingPackageId) ||
    (existingPackage.blockedPackageIds ?? []).includes(requestedPackageId)
  );
}

export function bookingBlocksRequestedPackage(
  booking: PackageConflictBooking,
  requestedPackageId: string | null | undefined,
  packages: BookingPackage[],
) {
  return bookingPackageConflicts({
    requestedPackageId,
    existingPackageId: booking.bookingPackageId,
    packages,
  });
}
