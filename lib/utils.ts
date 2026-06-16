export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
export const STANDARD_CHECK_IN_TIME = "2:00 PM";
export const STANDARD_CHECK_OUT_TIME = "11:00 AM";
export function formatStayDateRange(checkIn: string, checkOut: string) {
  return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
}
export function formatStayTimeRange() {
  return `Check-in ${STANDARD_CHECK_IN_TIME} - Check-out ${STANDARD_CHECK_OUT_TIME}`;
}
export function cn(...classes: Array<string | false | undefined>) { return classes.filter(Boolean).join(" "); }
