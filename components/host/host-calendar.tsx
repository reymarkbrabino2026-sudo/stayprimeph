"use client";

import { Ban, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock3, Home, Tag, Trash2, Users } from "lucide-react";
import { useActionState, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { avatarFallbackText } from "@/lib/avatar";
import { csrfFieldName } from "@/lib/csrf-fields";
import { calculateDefaultWeekendPrice, getNightlyRateDetails, isWeekendDayIndex } from "@/lib/pricing";
import { formatCurrency, formatStayTimeRange } from "@/lib/utils";
import type { AvailabilityBlockReason, BookingStatus, ListingRateAdjustment, ListingStatus, PaymentStatus } from "@/lib/types";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthWindow = 24;

type HostCalendarListing = {
  id: string;
  title: string;
  city: string;
  country: string;
  pricePerNight: number;
  weekendPrice?: number;
  holidayPrice?: number;
  holidayDates?: string[];
  seasonalRates?: Array<{ name: string; startDate: string; endDate: string; weekdayRate: number; weekendRate?: number; holidayRate?: number }>;
  rateAdjustments?: ListingRateAdjustment[];
  status: ListingStatus;
};

type HostCalendarBooking = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  bookingPackageName?: string;
  guestName: string;
  guestAvatar: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
};

type HostAvailabilityBlock = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  date: string;
  reason: AvailabilityBlockReason;
  note?: string;
};

type AvailabilityFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type RateCalendarFormState = AvailabilityFormState;

type HostRateAdjustment = ListingRateAdjustment & {
  propertyId: string;
  propertyTitle: string;
};

type HostCalendarProps = {
  listings: HostCalendarListing[];
  bookings: HostCalendarBooking[];
  availabilityBlocks: HostAvailabilityBlock[];
  blockAvailabilityAction: (state: AvailabilityFormState, formData: FormData) => Promise<AvailabilityFormState>;
  csrfToken: string;
  removeAvailabilityBlockAction: (formData: FormData) => Promise<void>;
  saveMonthlyRateAction: (state: RateCalendarFormState, formData: FormData) => Promise<RateCalendarFormState>;
  saveSelectedDateRateAction: (state: RateCalendarFormState, formData: FormData) => Promise<RateCalendarFormState>;
  setRateAdjustmentActiveAction: (formData: FormData) => Promise<void>;
  deleteRateAdjustmentAction: (formData: FormData) => Promise<void>;
};

const initialAvailabilityState: AvailabilityFormState = { status: "idle", message: "" };
const initialRateCalendarState: RateCalendarFormState = { status: "idle", message: "" };

export function HostCalendar({
  listings,
  bookings,
  availabilityBlocks,
  blockAvailabilityAction,
  csrfToken,
  removeAvailabilityBlockAction,
  saveMonthlyRateAction,
  saveSelectedDateRateAction,
  setRateAdjustmentActiveAction,
  deleteRateAdjustmentAction,
}: HostCalendarProps) {
  const scrollerRef = useRef<HTMLElement>(null);
  const monthRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const [selectedListingId, setSelectedListingId] = useState("all");
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [availabilityState, availabilityFormAction] = useActionState(blockAvailabilityAction, initialAvailabilityState);
  const [monthlyRateState, monthlyRateFormAction] = useActionState(saveMonthlyRateAction, initialRateCalendarState);
  const [selectedDateRateState, selectedDateRateFormAction] = useActionState(saveSelectedDateRateAction, initialRateCalendarState);

  const activeBookings = useMemo(() => bookings.filter((booking) => booking.status !== "cancelled"), [bookings]);
  const initialSelectedDate = useMemo(() => getInitialSelectedDate(activeBookings), [activeBookings]);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);

  const calendarStart = useMemo(() => resolveStartMonth(activeBookings), [activeBookings]);
  const months = useMemo(
    () => Array.from({ length: monthWindow }, (_, index) => buildMonth(calendarStart.year, calendarStart.month + index)),
    [calendarStart],
  );

  const selectedListing = listings.find((listing) => listing.id === selectedListingId);
  const visibleListings = useMemo(() => (selectedListing ? [selectedListing] : listings), [listings, selectedListing]);
  const filteredBookings = useMemo(
    () => activeBookings.filter((booking) => selectedListingId === "all" || booking.propertyId === selectedListingId),
    [activeBookings, selectedListingId],
  );
  const filteredBlocks = useMemo(
    () => availabilityBlocks.filter((block) => selectedListingId === "all" || block.propertyId === selectedListingId),
    [availabilityBlocks, selectedListingId],
  );
  const selectedDayBookings = useMemo(
    () => filteredBookings.filter((booking) => isDateWithinBooking(selectedDate, booking)),
    [filteredBookings, selectedDate],
  );
  const selectedDayBlocks = useMemo(
    () => filteredBlocks.filter((block) => block.date === selectedDate),
    [filteredBlocks, selectedDate],
  );
  const selectedDayRateAdjustments = useMemo(
    () => visibleListings.flatMap((listing) => (listing.rateAdjustments ?? [])
      .filter((adjustment) => adjustment.startDate <= selectedDate && selectedDate <= adjustment.endDate)
      .map((adjustment) => ({
        ...adjustment,
        propertyId: listing.id,
        propertyTitle: listing.title,
      }))),
    [selectedDate, visibleListings],
  );
  const visibleListingCount = selectedListing ? 1 : listings.length;
  const stats = useMemo(() => buildAvailabilityStats(months, filteredBookings, filteredBlocks, visibleListingCount), [months, filteredBookings, filteredBlocks, visibleListingCount]);
  const weekdayNightlyPrice = getAverageNightlyPrice(selectedListing ? [selectedListing] : listings);
  const weekendNightlyPrice = getAverageWeekendNightlyPrice(selectedListing ? [selectedListing] : listings);
  const activeRateRuleCount = visibleListings.reduce((count, listing) => count + (listing.rateAdjustments ?? []).filter((adjustment) => adjustment.active !== false).length, 0);
  const todayKey = toDateKey(new Date());

  const updateActiveMonth = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const marker = scroller.scrollTop + 160;
    let nextActiveIndex = 0;

    monthRefs.current.forEach((month, index) => {
      if (month && month.offsetTop <= marker) nextActiveIndex = index;
    });

    setActiveMonthIndex((current) => (current === nextActiveIndex ? current : nextActiveIndex));
  }, []);

  function scrollToMonth(index: number) {
    monthRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveMonthIndex(index);
  }

  function closeMenus() {
    setMonthPickerOpen(false);
    setViewMenuOpen(false);
  }

  function jumpToMonth(index: number, dateKey?: string) {
    scrollToMonth(index);
    const fallbackDate = months[index].cells.find((cell): cell is CalendarDay => Boolean(cell))?.dateKey;
    setSelectedDate(dateKey ?? fallbackDate ?? selectedDate);
    closeMenus();
  }

  function jumpToCurrentMonth() {
    const currentMonthIndex = months.findIndex((month) => month.cells.some((cell) => cell?.dateKey === todayKey));
    jumpToMonth(currentMonthIndex >= 0 ? currentMonthIndex : 0, todayKey);
  }

  function jumpToNextMonth() {
    jumpToMonth(Math.min(activeMonthIndex + 1, months.length - 1));
  }

  function selectListing(listingId: string) {
    setSelectedListingId(listingId);
    const nextBooking = activeBookings.find((booking) => listingId === "all" || booking.propertyId === listingId);
    setSelectedDate(nextBooking?.checkIn ?? toDateKey(new Date()));
  }

  return (
    <main className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <section
        ref={scrollerRef}
        onScroll={updateActiveMonth}
        className="h-[calc(100svh-6rem)] min-w-0 overflow-y-auto scroll-smooth px-3 pb-48 pt-0 sm:px-6 sm:pb-48 lg:px-14 lg:pb-10"
      >
        <div className="sticky top-0 z-10 -mx-3 bg-white/95 px-3 pb-3 pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-14 lg:px-14">
          <div className="flex items-end justify-between gap-3">
            <div className="relative min-w-0">
              <p className="truncate text-xs font-semibold text-black/45 sm:text-sm">{selectedListing ? selectedListing.title : "All host listings"}</p>
              <h1 className="flex min-w-0 items-center gap-1 text-[2rem] font-semibold leading-none sm:text-4xl">
                <button
                  type="button"
                  onClick={() => {
                    setMonthPickerOpen((current) => !current);
                    setViewMenuOpen(false);
                  }}
                  className="flex min-w-0 items-center gap-1 rounded-lg text-left transition hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                  aria-expanded={monthPickerOpen}
                  aria-label="Choose calendar month"
                  aria-haspopup="menu"
                >
                  <span className="truncate">{months[activeMonthIndex].label}</span> <ChevronDown className="shrink-0" size={24} />
                </button>
              </h1>
              {monthPickerOpen ? <MonthPicker months={months} activeMonthIndex={activeMonthIndex} onSelect={jumpToMonth} /> : null}
            </div>
            <div className="relative flex shrink-0 gap-2 sm:gap-3">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black/[0.06] px-3 text-sm font-semibold transition hover:bg-black/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black sm:px-4 sm:text-base"
                type="button"
                onClick={() => {
                  setViewMenuOpen((current) => !current);
                  setMonthPickerOpen(false);
                }}
                aria-expanded={viewMenuOpen}
                aria-haspopup="menu"
                aria-label="Calendar view options"
              >
                Month <ChevronDown size={16} />
              </button>
              <button
                className="grid size-10 place-items-center rounded-full bg-black/[0.06] transition hover:bg-black/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                type="button"
                aria-label="Jump to current month"
                onClick={jumpToCurrentMonth}
              >
                <CalendarDays size={16} />
              </button>
              {viewMenuOpen ? <CalendarViewMenu onClose={closeMenus} onCurrentMonth={jumpToCurrentMonth} onNextMonth={jumpToNextMonth} /> : null}
            </div>
          </div>

          <div className="no-scrollbar touch-scroll mt-4 flex gap-2 overflow-x-auto pb-2">
            <FilterButton active={selectedListingId === "all"} onClick={() => selectListing("all")}>
              All listings
            </FilterButton>
            {listings.map((listing) => (
              <FilterButton key={listing.id} active={selectedListingId === listing.id} onClick={() => selectListing(listing.id)}>
                {listing.title}
              </FilterButton>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-black/55 sm:mt-3 sm:text-sm sm:text-black/65">
            {weekdays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-8 pb-8 pt-2 sm:space-y-12 lg:pb-28">
          {months.map((month, index) => (
            <section
              key={month.id}
              id={month.id}
              ref={(node) => {
                monthRefs.current[index] = node;
              }}
              className="scroll-mt-36 sm:scroll-mt-40"
            >
              {index > 0 ? <h2 className="mb-4 text-2xl font-semibold sm:mb-5 sm:text-3xl">{month.label}</h2> : null}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {month.cells.map((cell, cellIndex) => (
                  <CalendarCell
                    key={`${month.id}-${cellIndex}`}
                    cell={cell}
                    bookings={filteredBookings}
                    availabilityBlocks={filteredBlocks}
                    listings={visibleListings}
                    isSelected={Boolean(cell && cell.dateKey === selectedDate)}
                    onSelect={setSelectedDate}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={jumpToNextMonth}
          className="fixed bottom-8 right-[calc(26rem+2.5rem)] hidden size-14 place-items-center rounded-full bg-white shadow-[0_8px_30px_rgb(0_0_0_/_0.2)] transition hover:scale-105 lg:grid"
          aria-label="Jump to next month"
        >
          <ChevronDown />
        </button>
      </section>

      <aside className="fixed inset-x-0 bottom-0 z-30 max-h-44 overflow-y-auto rounded-t-lg border-t border-black/10 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgb(0_0_0_/_0.10)] sm:max-h-44 sm:px-6 lg:static lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-l lg:border-t-0 lg:px-10 lg:py-14 lg:shadow-none">
        <div className="lg:sticky lg:top-8">
          <SelectedDatePanel
            dateKey={selectedDate}
            bookings={selectedDayBookings}
            availabilityBlocks={selectedDayBlocks}
            rateAdjustments={selectedDayRateAdjustments}
            csrfToken={csrfToken}
            removeAvailabilityBlockAction={removeAvailabilityBlockAction}
            setRateAdjustmentActiveAction={setRateAdjustmentActiveAction}
            deleteRateAdjustmentAction={deleteRateAdjustmentAction}
          />
          <RateCalendarForm
            key={`rates-${selectedDate}-${selectedListingId}`}
            dateKey={selectedDate}
            csrfToken={csrfToken}
            listings={listings}
            selectedListingId={selectedListingId}
            monthlyAction={monthlyRateFormAction}
            selectedDateAction={selectedDateRateFormAction}
            monthlyState={monthlyRateState}
            selectedDateState={selectedDateRateState}
          />
          <AvailabilityBlockForm
            key={`${selectedDate}-${selectedListingId}`}
            dateKey={selectedDate}
            csrfToken={csrfToken}
            listings={listings}
            selectedListingId={selectedListingId}
            action={availabilityFormAction}
            state={availabilityState}
          />
          <div className="hidden lg:block">
            <SideRow
              icon={<Home size={18} />}
              title="Price settings"
              lines={[
                `${formatCurrency(weekdayNightlyPrice)} weekday nightly rate`,
                `${formatCurrency(weekendNightlyPrice)} weekend nightly rate`,
                `${activeRateRuleCount} active calendar rate rule${activeRateRuleCount === 1 ? "" : "s"}`,
                selectedListing ? selectedListing.title : `${listings.length} listings shown`,
              ]}
            />
            <SideRow
              icon={<CheckCircle2 size={18} />}
              title="Availability settings"
              lines={[
                `${stats.openNights} open nights in view`,
                `${stats.reservedDays} reserved or blocked nights`,
                `${stats.pendingReservations} pending requests`,
              ]}
            />
            <SideRow
              icon={<Clock3 size={18} />}
              title="Calendar sync"
              lines={[
                `${filteredBookings.length} reservations loaded`,
                `${filteredBlocks.length} host-blocked nights`,
                `${stats.confirmedReservations} confirmed bookings`,
              ]}
            />
          </div>
        </div>
      </aside>
    </main>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "max-w-72 shrink-0 truncate rounded-lg border px-4 py-2 text-sm font-semibold transition",
        active ? "border-black bg-black text-white" : "border-black/10 bg-white text-black/70 hover:border-black/30",
      )}
    >
      {children}
    </button>
  );
}

function MonthPicker({
  months,
  activeMonthIndex,
  onSelect,
}: {
  months: ReturnType<typeof buildMonth>[];
  activeMonthIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="absolute left-0 top-[calc(100%+0.5rem)] z-30 max-h-72 w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-white p-2 text-sm font-semibold leading-normal shadow-[0_14px_40px_rgb(0_0_0_/_0.18)] ring-1 ring-black/10"
      role="menu"
    >
      {months.map((month, index) => (
        <button
          key={month.id}
          type="button"
          role="menuitem"
          onClick={() => onSelect(index)}
          className={cx(
            "flex min-h-10 w-full items-center justify-between rounded-md px-3 text-left transition hover:bg-black/[0.05]",
            index === activeMonthIndex && "bg-black text-white hover:bg-black",
          )}
        >
          {month.label}
          {index === activeMonthIndex ? <CheckCircle2 size={16} /> : null}
        </button>
      ))}
    </div>
  );
}

function CalendarViewMenu({
  onClose,
  onCurrentMonth,
  onNextMonth,
}: {
  onClose: () => void;
  onCurrentMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-56 rounded-lg bg-white p-2 text-sm shadow-[0_14px_40px_rgb(0_0_0_/_0.18)] ring-1 ring-black/10" role="menu">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase text-black/45">Calendar view</p>
      <button type="button" role="menuitem" onClick={onClose} className="flex min-h-10 w-full items-center justify-between rounded-md px-3 text-left font-semibold transition hover:bg-black/[0.05]">
        Month view
        <CheckCircle2 size={16} />
      </button>
      <button type="button" role="menuitem" onClick={onCurrentMonth} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left transition hover:bg-black/[0.05]">
        <CalendarDays size={16} /> Current month
      </button>
      <button type="button" role="menuitem" onClick={onNextMonth} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left transition hover:bg-black/[0.05]">
        <ChevronDown size={16} /> Next month
      </button>
    </div>
  );
}

function CalendarCell({
  cell,
  bookings,
  availabilityBlocks,
  listings,
  isSelected,
  onSelect,
}: {
  cell: CalendarDay | null;
  bookings: HostCalendarBooking[];
  availabilityBlocks: HostAvailabilityBlock[];
  listings: HostCalendarListing[];
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
}) {
  if (!cell) return <div className="min-h-20 rounded-lg border border-transparent bg-transparent sm:min-h-32" />;

  const dayBookings = bookings.filter((booking) => isDateWithinBooking(cell.dateKey, booking));
  const dayBlocks = availabilityBlocks.filter((block) => block.date === cell.dateKey);
  const confirmed = dayBookings.some((booking) => booking.status === "confirmed");
  const pending = dayBookings.some((booking) => booking.status === "pending" || booking.paymentStatus === "submitted");
  const completed = dayBookings.some((booking) => booking.status === "completed");
  const blocked = dayBlocks.length > 0;
  const rateDetails = getAverageRateDetails(listings, cell.dateKey);
  const rate = cell.price || rateDetails.netRate;
  const hasPromo = rateDetails.discountAmount > 0;
  const label = `${formatDisplayDate(cell.dateKey)} ${
    dayBookings.length > 0
      ? `${dayBookings.length} reservation${dayBookings.length === 1 ? "" : "s"}`
      : blocked
        ? `${dayBlocks.length} unavailable block${dayBlocks.length === 1 ? "" : "s"}`
        : "available"
  }`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(cell.dateKey)}
      className={cx(
        "min-h-20 min-w-0 overflow-hidden rounded-lg border p-1.5 text-left transition hover:border-black/30 hover:shadow-[0_8px_24px_rgb(0_0_0_/_0.08)] sm:min-h-32 sm:p-3",
        cell.isWeekend ? "border-black/10 bg-[#f2f2f2]" : "border-black/10 bg-[#f7f7f7]",
        !confirmed && !pending && !completed && !blocked && "hover:bg-white",
        blocked && !confirmed && !pending && !completed && "border-zinc-300 bg-zinc-200 text-black hover:border-zinc-400 hover:bg-zinc-300",
        confirmed && "border-emerald-700 bg-emerald-700 text-white hover:border-emerald-800 hover:bg-emerald-800",
        pending && !confirmed && "border-amber-300 bg-amber-50 text-black hover:border-amber-400 hover:bg-amber-100",
        completed && !confirmed && !pending && "border-black/20 bg-black/[0.08] text-black hover:bg-black/[0.08]",
        isSelected && "ring-2 ring-black ring-offset-2",
      )}
    >
      <span className={cx("block text-sm font-semibold leading-5 sm:text-lg", confirmed ? "text-white" : "text-black/65")}>{cell.day}</span>
      <span className={cx("mt-2 block text-[11px] font-semibold leading-none sm:hidden", confirmed ? "text-white/90" : "text-black/70")}>{formatCompactPrice(rate)}</span>
      <span className={cx("mt-6 hidden text-sm font-semibold sm:block", confirmed ? "text-white/90" : "text-black/70")}>{formatCurrency(rate)}</span>
      {hasPromo ? (
        <span className={cx("mt-1 hidden max-w-full truncate rounded-md px-2 py-1 text-[11px] font-semibold sm:inline-flex", confirmed ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700")}>
          {rateDetails.discountLabel || "Promo"}
        </span>
      ) : null}
      <MobileBookingAvatars bookings={dayBookings} confirmed={confirmed} />
      <span className="mt-3 hidden flex-col gap-1 sm:flex">
        {dayBookings.slice(0, 2).map((booking) => (
          <span
            key={booking.id}
            className={cx(
              "block max-w-full truncate rounded-md px-2 py-1 text-xs font-semibold",
              confirmed ? "bg-white/20 text-white" : "bg-white text-black/75",
            )}
          >
            {booking.guestName}
          </span>
        ))}
        {dayBookings.length > 2 ? (
          <span className={cx("text-xs font-semibold", confirmed ? "text-white/80" : "text-black/45")}>+{dayBookings.length - 2} more</span>
        ) : null}
        {dayBookings.length === 0 && dayBlocks.slice(0, 1).map((block) => (
          <span key={block.id} className="block max-w-full truncate rounded-md bg-white px-2 py-1 text-xs font-semibold text-black/75">
            {formatBlockReason(block.reason)}
          </span>
        ))}
      </span>
    </button>
  );
}

function MobileBookingAvatars({ bookings, confirmed }: { bookings: HostCalendarBooking[]; confirmed: boolean }) {
  if (bookings.length === 0) return null;

  const visibleBookings = bookings.slice(0, 2);
  const remainingBookings = bookings.length - visibleBookings.length;

  return (
    <span className="mt-2 flex items-center -space-x-1 sm:hidden" aria-hidden="true">
      {visibleBookings.map((booking) => (
        <span
          key={booking.id}
          className={cx(
            "grid size-5 shrink-0 place-items-center rounded-full border text-[8px] font-bold uppercase leading-none shadow-sm",
            confirmed ? "border-emerald-700 bg-white text-emerald-800" : "border-white bg-black text-white",
          )}
        >
          {getAvatarLabel(booking)}
        </span>
      ))}
      {remainingBookings > 0 ? (
        <span
          className={cx(
            "grid size-5 shrink-0 place-items-center rounded-full border text-[8px] font-bold leading-none shadow-sm",
            confirmed ? "border-emerald-700 bg-white text-emerald-800" : "border-white bg-black text-white",
          )}
        >
          +{remainingBookings}
        </span>
      ) : null}
    </span>
  );
}

function SelectedDatePanel({
  dateKey,
  bookings,
  availabilityBlocks,
  rateAdjustments,
  csrfToken,
  removeAvailabilityBlockAction,
  setRateAdjustmentActiveAction,
  deleteRateAdjustmentAction,
}: {
  dateKey: string;
  bookings: HostCalendarBooking[];
  availabilityBlocks: HostAvailabilityBlock[];
  rateAdjustments: HostRateAdjustment[];
  csrfToken: string;
  removeAvailabilityBlockAction: (formData: FormData) => Promise<void>;
  setRateAdjustmentActiveAction: (formData: FormData) => Promise<void>;
  deleteRateAdjustmentAction: (formData: FormData) => Promise<void>;
}) {
  const hasBlocks = availabilityBlocks.length > 0;
  const hasReservations = bookings.length > 0;

  return (
    <section className="pb-0 lg:border-b lg:border-black/10 lg:pb-7">
      <p className="text-xs font-semibold text-black/45 sm:text-sm">{formatDisplayDate(dateKey)}</p>
      <h2 className="mt-1 text-lg font-semibold sm:text-xl lg:mt-2 lg:text-2xl">{hasReservations ? "Reserved" : hasBlocks ? "Unavailable" : "Available"}</h2>
      <div className="mt-2 space-y-2 lg:mt-4 lg:space-y-3">
        {!hasReservations && !hasBlocks ? (
          <p className="rounded-lg bg-[#f7f7f7] p-2 text-sm text-black/60 lg:p-3">No host reservations are blocking this date.</p>
        ) : (
          <>
            {bookings.map((booking) => (
              <article key={booking.id} className="rounded-lg border border-black/10 p-2 lg:p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold">{booking.guestName}</p>
                  <StatusDot status={booking.status} />
                </div>
                <p className="mt-1 hidden truncate text-sm text-black/55 sm:block">{booking.propertyTitle}</p>
                <p className="mt-2 hidden items-center gap-2 text-sm text-black/55 sm:flex">
                  <Users size={14} /> {booking.guests} guests{booking.bookingPackageName ? ` - ${booking.bookingPackageName}` : ""}
                </p>
                <p className="mt-1 text-xs text-black/55 sm:text-sm">
                  {formatDisplayDate(booking.checkIn)} to {formatDisplayDate(booking.checkOut)}
                </p>
                <p className="mt-1 text-xs text-black/45">{formatStayTimeRange()}</p>
              </article>
            ))}
            {availabilityBlocks.map((block) => (
              <article key={block.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 lg:p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{formatBlockReason(block.reason)}</p>
                    <p className="mt-1 truncate text-sm text-black/55">{block.propertyTitle}</p>
                    {block.note ? <p className="mt-1 text-sm text-black/65">{block.note}</p> : null}
                  </div>
                  <form action={removeAvailabilityBlockAction}>
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <button type="submit" className="grid size-9 place-items-center rounded-full text-black/45 transition hover:bg-black/[0.06] hover:text-black" aria-label="Remove availability block">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </>
        )}
      </div>
      {rateAdjustments.length > 0 ? (
        <div className="mt-3 space-y-2 lg:mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/40">Rates & promos</p>
          {rateAdjustments.map((adjustment) => (
            <article key={`${adjustment.propertyId}-${adjustment.id}`} className={cx("rounded-lg border p-2 lg:p-3", adjustment.active === false ? "border-black/10 bg-black/[0.02] text-black/55" : "border-emerald-100 bg-emerald-50/70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{adjustment.name}</p>
                  <p className="mt-1 text-sm text-black/60">{formatRateAdjustmentSummary(adjustment)}</p>
                  <p className="mt-1 truncate text-xs text-black/45">{adjustment.propertyTitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={setRateAdjustmentActiveAction}>
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="propertyId" value={adjustment.propertyId} />
                    <input type="hidden" name="adjustmentId" value={adjustment.id} />
                    <input type="hidden" name="active" value={adjustment.active === false ? "true" : "false"} />
                    <button
                      type="submit"
                      className="grid size-9 place-items-center rounded-full text-black/50 transition hover:bg-black/[0.06] hover:text-black"
                      aria-label={adjustment.active === false ? "Activate rate or promo" : "Deactivate rate or promo"}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </form>
                  <form action={deleteRateAdjustmentAction}>
                    <input type="hidden" name={csrfFieldName} value={csrfToken} />
                    <input type="hidden" name="propertyId" value={adjustment.propertyId} />
                    <input type="hidden" name="adjustmentId" value={adjustment.id} />
                    <button type="submit" className="grid size-9 place-items-center rounded-full text-black/45 transition hover:bg-black/[0.06] hover:text-black" aria-label="Delete rate or promo">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RateCalendarForm({
  dateKey,
  listings,
  selectedListingId,
  monthlyAction,
  selectedDateAction,
  csrfToken,
  monthlyState,
  selectedDateState,
}: {
  dateKey: string;
  csrfToken: string;
  listings: HostCalendarListing[];
  selectedListingId: string;
  monthlyAction: (formData: FormData) => void;
  selectedDateAction: (formData: FormData) => void;
  monthlyState: RateCalendarFormState;
  selectedDateState: RateCalendarFormState;
}) {
  const selectedListing = listings.find((listing) => listing.id === selectedListingId);
  const [adjustmentType, setAdjustmentType] = useState<"percent_discount" | "custom_price">("percent_discount");
  const endDate = addDays(dateKey, 1);
  const amountLabel = adjustmentType === "percent_discount" ? "Discount %" : "Custom price";

  return (
    <section className="mt-4 rounded-lg border border-black/10 bg-white p-3 lg:mt-7 lg:p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-black/[0.05]"><Tag size={16} /></span>
        <div>
          <h2 className="font-semibold">Rates & promos</h2>
          <p className="text-sm text-black/55">Set future monthly rates or discounts for selected dates.</p>
        </div>
      </div>

      <form action={monthlyAction} className="mt-4 space-y-3 rounded-lg bg-black/[0.03] p-3">
        <input type="hidden" name={csrfFieldName} value={csrfToken} />
        <ListingPicker selectedListing={selectedListing} listings={listings} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <label className="text-sm font-semibold text-black/65">
            Month
            <input name="month" type="month" defaultValue={dateKey.slice(0, 7)} required className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
          </label>
          <label className="text-sm font-semibold text-black/65">
            Price
            <input name="rate" type="number" min={1} max={1000000} step={1} defaultValue={selectedListing?.pricePerNight ?? ""} placeholder="Monthly price" required className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
          </label>
        </div>
        {monthlyState.message ? <FormMessage state={monthlyState} /> : null}
        <RateCalendarSubmitButton label="Save monthly price" pendingLabel="Saving..." />
      </form>

      <form action={selectedDateAction} className="mt-3 space-y-3 rounded-lg bg-black/[0.03] p-3">
        <input type="hidden" name={csrfFieldName} value={csrfToken} />
        <ListingPicker selectedListing={selectedListing} listings={listings} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <label className="text-sm font-semibold text-black/65">
            Start
            <input name="checkIn" type="date" defaultValue={dateKey} required className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
          </label>
          <label className="text-sm font-semibold text-black/65">
            End
            <input name="checkOut" type="date" defaultValue={endDate} required className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
          </label>
        </div>
        <select
          name="adjustmentType"
          value={adjustmentType}
          onChange={(event) => setAdjustmentType(event.target.value as "percent_discount" | "custom_price")}
          className="min-h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold"
        >
          <option value="percent_discount">Discount percentage</option>
          <option value="custom_price">Custom price</option>
        </select>
        <label className="text-sm font-semibold text-black/65">
          Promo or rate name
          <input name="name" type="text" maxLength={80} placeholder={adjustmentType === "percent_discount" ? "Promo name" : "Rate name"} className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
        </label>
        <label className="text-sm font-semibold text-black/65">
          {amountLabel}
          <input
            name="amount"
            type="number"
            min={1}
            max={adjustmentType === "percent_discount" ? 100 : 1000000}
            step={1}
            placeholder={adjustmentType === "percent_discount" ? "Discount percent" : "Custom price"}
            required
            className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-black/70">
          <input name="active" type="checkbox" defaultChecked className="size-4" />
          Active
        </label>
        {selectedDateState.message ? <FormMessage state={selectedDateState} /> : null}
        <RateCalendarSubmitButton label="Save selected dates" pendingLabel="Saving..." />
      </form>
    </section>
  );
}

function ListingPicker({ selectedListing, listings }: { selectedListing?: HostCalendarListing; listings: HostCalendarListing[] }) {
  if (selectedListing) {
    return (
      <>
        <input type="hidden" name="propertyId" value={selectedListing.id} />
        <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black/70">{selectedListing.title}</p>
      </>
    );
  }

  return (
    <select name="propertyId" required className="min-h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold">
      <option value="">Choose listing</option>
      {listings.map((listing) => (
        <option key={listing.id} value={listing.id}>{listing.title}</option>
      ))}
    </select>
  );
}

function FormMessage({ state }: { state: RateCalendarFormState | AvailabilityFormState }) {
  return <p className={cx("rounded-lg p-2 text-sm", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{state.message}</p>;
}

function RateCalendarSubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#083f35] px-4 text-sm font-semibold text-white transition hover:bg-[#062f28] disabled:cursor-wait disabled:bg-[#083f35]/70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function AvailabilityBlockForm({
  dateKey,
  listings,
  selectedListingId,
  action,
  csrfToken,
  state,
}: {
  dateKey: string;
  csrfToken: string;
  listings: HostCalendarListing[];
  selectedListingId: string;
  action: (formData: FormData) => void;
  state: AvailabilityFormState;
}) {
  const selectedListing = listings.find((listing) => listing.id === selectedListingId);
  const endDate = addDays(dateKey, 1);

  return (
    <section className="mt-4 rounded-lg border border-black/10 bg-white p-3 lg:mt-7 lg:p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-black/[0.05]"><Ban size={16} /></span>
        <div>
          <h2 className="font-semibold">Mark unavailable</h2>
          <p className="text-sm text-black/55">Block owner-use dates with no payment, outside bookings, or maintenance.</p>
        </div>
      </div>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name={csrfFieldName} value={csrfToken} />
        {selectedListing ? (
          <>
            <input type="hidden" name="propertyId" value={selectedListing.id} />
            <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-sm font-semibold text-black/70">{selectedListing.title}</p>
          </>
        ) : (
          <select name="propertyId" required className="min-h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold">
            <option value="">Choose listing</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>{listing.title}</option>
            ))}
          </select>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <label className="text-sm font-semibold text-black/65">
            Start
            <input name="checkIn" type="date" defaultValue={dateKey} required className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
          </label>
          <label className="text-sm font-semibold text-black/65">
            End
            <input name="checkOut" type="date" defaultValue={endDate} required className="mt-1 min-h-11 w-full rounded-lg border border-black/10 px-3 text-sm" />
          </label>
        </div>
        <select name="reason" defaultValue="booked_elsewhere" className="min-h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold">
          <option value="booked_elsewhere">Booked on another platform</option>
          <option value="owner_use">Booked by owner (no pay)</option>
          <option value="maintenance">Maintenance</option>
          <option value="other">Other</option>
        </select>
        <textarea name="note" rows={2} maxLength={240} placeholder="Optional note" className="w-full resize-none rounded-lg border border-black/10 p-3 text-sm" />
        {state.message ? <FormMessage state={state} /> : null}
        <AvailabilitySubmitButton />
      </form>
    </section>
  );
}

function AvailabilitySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-wait disabled:bg-black/70"
    >
      {pending ? "Saving..." : "Block dates"}
    </button>
  );
}

function StatusDot({ status }: { status: BookingStatus }) {
  const isConfirmed = status === "confirmed";
  const isCompleted = status === "completed";
  return (
    <span
      className={cx(
        "shrink-0 rounded-full px-2 py-1 text-xs font-semibold",
        isConfirmed && "bg-emerald-100 text-emerald-700",
        isCompleted && "bg-black/[0.08] text-black/65",
        !isConfirmed && !isCompleted && "bg-amber-100 text-amber-700",
      )}
    >
      {capitalize(status)}
    </span>
  );
}

function SideRow({ icon, title, lines }: { icon: ReactNode; title: string; lines: string[] }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/10 py-4 lg:py-7">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-black/[0.05]">{icon}</span>
          <h2 className="font-semibold">{title}</h2>
        </div>
        {lines.map((line) => (
          <p key={line} className="mt-1 truncate text-sm text-black/65 lg:text-base">
            {line}
          </p>
        ))}
      </div>
      <ChevronRight className="hidden shrink-0 rounded-full bg-black/[0.04] p-2 sm:block" size={40} />
    </div>
  );
}

type CalendarDay = {
  dateKey: string;
  day: number;
  isWeekend: boolean;
  price: number;
};

function buildMonth(year: number, zeroBasedMonth: number) {
  const date = new Date(year, zeroBasedMonth, 1);
  const displayYear = date.getFullYear();
  const displayMonth = date.getMonth();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const leadingBlanks = new Date(displayYear, displayMonth, 1).getDay();
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7;
  const cells: Array<CalendarDay | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dayOfWeek = new Date(displayYear, displayMonth, day).getDay();
      const isWeekend = isWeekendDayIndex(dayOfWeek);

      return {
        dateKey: toDateKey(new Date(displayYear, displayMonth, day)),
        day,
        isWeekend,
        price: 0,
      };
    }),
    ...Array.from({ length: trailingBlanks }, () => null),
  ];

  return {
    id: `${monthNames[displayMonth].toLowerCase()}-${displayYear}`,
    label: `${monthNames[displayMonth]} ${displayYear}`,
    cells,
  };
}

function buildAvailabilityStats(months: ReturnType<typeof buildMonth>[], bookings: HostCalendarBooking[], availabilityBlocks: HostAvailabilityBlock[], listingCount: number) {
  const dateKeys = months.flatMap((month) => month.cells.flatMap((cell) => (cell ? [cell.dateKey] : [])));
  const datesInView = new Set(dateKeys);
  const reservedDays = bookings.reduce(
    (total, booking) => total + getBookedDateKeys(booking).filter((dateKey) => datesInView.has(dateKey)).length,
    0,
  );
  const blockedDays = availabilityBlocks.filter((block) => datesInView.has(block.date)).length;

  const totalBookableNights = dateKeys.length * listingCount;

  return {
    openNights: Math.max(totalBookableNights - reservedDays - blockedDays, 0),
    reservedDays: reservedDays + blockedDays,
    pendingReservations: bookings.filter((booking) => booking.status === "pending" || booking.paymentStatus === "submitted").length,
    confirmedReservations: bookings.filter((booking) => booking.status === "confirmed").length,
  };
}

function getBookedDateKeys(booking: HostCalendarBooking) {
  const dateKeys: string[] = [];
  const current = parseDateKey(booking.checkIn);
  const checkout = parseDateKey(booking.checkOut);

  while (current.getTime() < checkout.getTime()) {
    dateKeys.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dateKeys;
}

function isDateWithinBooking(dateKey: string, booking: HostCalendarBooking) {
  const date = parseDateKey(dateKey).getTime();
  return date >= parseDateKey(booking.checkIn).getTime() && date < parseDateKey(booking.checkOut).getTime();
}

function getInitialSelectedDate(bookings: HostCalendarBooking[]) {
  const today = toDateKey(new Date());
  return [...bookings].sort((a, b) => parseDateKey(a.checkIn).getTime() - parseDateKey(b.checkIn).getTime()).find((booking) => booking.checkOut > today)?.checkIn ?? today;
}

function resolveStartMonth(bookings: HostCalendarBooking[]) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const earliestBooking = [...bookings]
    .filter((booking) => booking.checkOut > todayKey)
    .sort((a, b) => parseDateKey(a.checkIn).getTime() - parseDateKey(b.checkIn).getTime())
    .at(0);
  const firstMonth = earliestBooking ? parseDateKey(earliestBooking.checkIn) : currentMonth;
  const start = firstMonth < currentMonth ? firstMonth : currentMonth;

  return { year: start.getFullYear(), month: start.getMonth() };
}

function getAverageNightlyPrice(listings: HostCalendarListing[]) {
  if (listings.length === 0) return 0;
  return Math.round(listings.reduce((sum, listing) => sum + listing.pricePerNight, 0) / listings.length);
}

function getAverageWeekendNightlyPrice(listings: HostCalendarListing[]) {
  if (listings.length === 0) return 0;
  return Math.round(listings.reduce((sum, listing) => sum + (listing.weekendPrice ?? calculateDefaultWeekendPrice(listing.pricePerNight)), 0) / listings.length);
}

function getAverageRateDetails(listings: HostCalendarListing[], dateKey: string) {
  if (listings.length === 0) return { grossRate: 0, netRate: 0, discountAmount: 0, discountLabel: "" };

  const details = listings.map((listing) => getNightlyRateDetails(listing, dateKey));
  const discountedDetail = details.find((detail) => detail.discountAmount > 0);

  return {
    grossRate: Math.round(details.reduce((sum, detail) => sum + detail.grossRate, 0) / details.length),
    netRate: Math.round(details.reduce((sum, detail) => sum + detail.netRate, 0) / details.length),
    discountAmount: Math.round(details.reduce((sum, detail) => sum + detail.discountAmount, 0) / details.length),
    discountLabel: discountedDetail?.discountPercent ? `${discountedDetail.discountPercent}% off` : discountedDetail?.discountLabel ?? "",
  };
}

function formatRateAdjustmentSummary(adjustment: ListingRateAdjustment) {
  const status = adjustment.active === false ? "Inactive" : "Active";
  const dates = adjustment.startDate === adjustment.endDate
    ? formatDisplayDate(adjustment.startDate)
    : `${formatDisplayDate(adjustment.startDate)} to ${formatDisplayDate(adjustment.endDate)}`;

  if (adjustment.type === "discount") {
    const discount = adjustment.discountPercent
      ? `${adjustment.discountPercent}% off`
      : adjustment.discountAmount
        ? `${formatCurrency(adjustment.discountAmount)} off`
        : "Discount";
    return `${discount} - ${dates} - ${status}`;
  }

  const rate = adjustment.weekdayRate ? formatCurrency(adjustment.weekdayRate) : "Custom price";
  return `${rate} - ${dates} - ${status}`;
}

function formatCompactPrice(value: number) {
  if (value >= 1000) {
    return `P${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }

  return `P${value}`;
}

function getAvatarLabel(booking: HostCalendarBooking) {
  return avatarFallbackText(booking.guestAvatar, booking.guestName, "G");
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parseDateKey(dateKey));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBlockReason(reason: AvailabilityBlockReason) {
  switch (reason) {
    case "booked_elsewhere":
      return "Booked on another platform";
    case "owner_use":
      return "Booked by owner (no pay)";
    case "maintenance":
      return "Maintenance";
    case "other":
      return "Unavailable";
  }
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}
