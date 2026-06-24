import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import {
  listHostCustomerProfilesFromDatabase,
  upsertHostCustomerProfileInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { HostCustomerClassification, HostCustomerProfile } from "@/lib/types";

const storeFileName = "host-customer-profiles.json";

export async function readHostCustomerProfiles(hostId?: string): Promise<HostCustomerProfile[]> {
  if (usesPrismaPersistence()) return listHostCustomerProfilesFromDatabase(hostId);

  const profiles = await readJsonStore<HostCustomerProfile>(storeFileName);
  return hostId ? profiles.filter((profile) => profile.hostId === hostId) : profiles;
}

export async function saveHostCustomerClassification({
  hostId,
  guestId,
  classification,
}: {
  hostId: string;
  guestId: string;
  classification: HostCustomerClassification;
}) {
  if (usesPrismaPersistence()) {
    await upsertHostCustomerProfileInDatabase({ hostId, guestId, classification });
    return;
  }

  const now = new Date().toISOString();
  const profiles = await readJsonStore<HostCustomerProfile>(storeFileName);
  const existing = profiles.find((profile) => profile.hostId === hostId && profile.guestId === guestId);
  const nextProfile: HostCustomerProfile = {
    id: existing?.id ?? `${hostId}:${guestId}`,
    hostId,
    guestId,
    classification,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await writeJsonStore(
    storeFileName,
    existing
      ? profiles.map((profile) => (profile.id === existing.id ? nextProfile : profile))
      : [nextProfile, ...profiles],
  );
}
