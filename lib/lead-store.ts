import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import {
  archiveLeadInDatabase,
  createLeadInDatabase,
  listLeadsFromDatabase,
  updateLeadInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Lead } from "@/lib/types";

const storeFileName = "host-leads.json";

export async function readLeads(hostId?: string): Promise<Lead[]> {
  if (usesPrismaPersistence()) return listLeadsFromDatabase(hostId);

  const leads = await readJsonStore<Lead>(storeFileName);
  return leads
    .filter((lead) => !lead.archivedAt)
    .filter((lead) => !hostId || lead.hostId === hostId)
    .sort((a, b) => a.displayOrder - b.displayOrder || b.updatedAt.localeCompare(a.updatedAt));
}

export async function createLead(lead: Lead) {
  if (usesPrismaPersistence()) {
    await createLeadInDatabase(lead);
    return;
  }

  const leads = await readJsonStore<Lead>(storeFileName);
  await writeJsonStore(storeFileName, [lead, ...leads]);
}

export async function replaceLead(updatedLead: Lead) {
  if (usesPrismaPersistence()) {
    await updateLeadInDatabase(updatedLead);
    return;
  }

  const leads = await readJsonStore<Lead>(storeFileName);
  await writeJsonStore(
    storeFileName,
    leads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
  );
}

export async function archiveLead(leadId: string, archivedAt: string) {
  if (usesPrismaPersistence()) {
    await archiveLeadInDatabase(leadId, archivedAt);
    return;
  }

  const leads = await readJsonStore<Lead>(storeFileName);
  await writeJsonStore(
    storeFileName,
    leads.map((lead) => (lead.id === leadId ? { ...lead, archivedAt, updatedAt: archivedAt } : lead)),
  );
}
