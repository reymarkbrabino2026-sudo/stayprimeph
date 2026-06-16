import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import type { HostMonthlyReport } from "@/lib/types";

const storeFileName = "host-monthly-reports.json";

export async function readHostMonthlyReports(): Promise<HostMonthlyReport[]> {
  return readJsonStore<HostMonthlyReport>(storeFileName);
}

export async function writeHostMonthlyReports(reports: HostMonthlyReport[]) {
  await writeJsonStore(storeFileName, reports);
}
