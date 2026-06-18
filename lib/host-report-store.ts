import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { deleteHostMonthlyReportFromDatabase, listHostMonthlyReportsFromDatabase, upsertHostMonthlyReportInDatabase, usesPrismaPersistence, writeHostMonthlyReportsToDatabase } from "@/lib/repositories";
import type { HostMonthlyReport } from "@/lib/types";

const storeFileName = "host-monthly-reports.json";

export async function readHostMonthlyReports(): Promise<HostMonthlyReport[]> {
  if (usesPrismaPersistence()) return listHostMonthlyReportsFromDatabase();
  return readJsonStore<HostMonthlyReport>(storeFileName);
}

export async function writeHostMonthlyReports(reports: HostMonthlyReport[]) {
  if (usesPrismaPersistence()) {
    await writeHostMonthlyReportsToDatabase(reports);
    return;
  }
  await writeJsonStore(storeFileName, reports);
}

export async function saveHostMonthlyReport(report: HostMonthlyReport) {
  if (usesPrismaPersistence()) {
    await upsertHostMonthlyReportInDatabase(report);
    return;
  }

  const reports = await readJsonStore<HostMonthlyReport>(storeFileName);
  const existing = reports.some((item) => item.id === report.id);
  await writeJsonStore(
    storeFileName,
    existing ? reports.map((item) => item.id === report.id ? report : item) : [report, ...reports],
  );
}

export async function removeHostMonthlyReport(reportId: string) {
  if (usesPrismaPersistence()) {
    await deleteHostMonthlyReportFromDatabase(reportId);
    return;
  }

  const reports = await readJsonStore<HostMonthlyReport>(storeFileName);
  await writeJsonStore(storeFileName, reports.filter((report) => report.id !== reportId));
}
