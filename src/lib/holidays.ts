/**
 * Hidden background calendar engine.
 * Computes, for any given moment, whether a global holiday/event window is active.
 * Purely date-driven — no configuration, no manual switches, no user-facing controls.
 * Deliberately excludes Pride Month and Black History Month.
 */

export interface HolidayEvent {
  id: string;
  /** Short user-facing label used in the theme popup. */
  label: string;
  /** Inclusive start / exclusive end of the active window. */
  start: Date;
  end: Date;
  /** Theme accent applied app-wide while active (CSS class suffix). */
  theme: string;
}

const UTC = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m, d, h, 0, 0));

/** Anonymous Gregorian computus — returns Easter Sunday for a year (UTC). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return UTC(year, month, day);
}

/** nth weekday (0=Sun) of a month, e.g. 4th Thursday of November. */
function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  const first = UTC(year, month, 1);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return UTC(year, month, 1 + offset + (nth - 1) * 7);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** All event windows that touch the given year. */
function eventsForYear(year: number): HolidayEvent[] {
  const easter = easterSunday(year);
  const thanksgiving = nthWeekday(year, 10, 4, 4); // 4th Thursday of November
  const blackFriday = addDays(thanksgiving, 1);

  return [
    {
      id: "new-year",
      label: "New Year",
      start: UTC(year - 1, 11, 30),
      end: UTC(year, 0, 3),
      theme: "newyear",
    },
    {
      id: "valentines",
      label: "Valentine's Day",
      start: UTC(year, 1, 12),
      end: UTC(year, 1, 16),
      theme: "valentines",
    },
    {
      id: "easter",
      label: "Easter",
      start: addDays(easter, -2),
      end: addDays(easter, 2),
      theme: "easter",
    },
    {
      id: "back-to-school",
      label: "Back to School",
      start: UTC(year, 7, 25),
      end: UTC(year, 8, 8),
      theme: "school",
    },
    {
      id: "halloween",
      label: "Halloween",
      start: UTC(year, 9, 25),
      end: UTC(year, 10, 1),
      theme: "halloween",
    },
    {
      id: "black-friday",
      label: "Black Friday",
      start: blackFriday,
      end: addDays(blackFriday, 4), // through Cyber Monday
      theme: "blackfriday",
    },
    {
      id: "christmas",
      label: "Christmas",
      start: UTC(year, 11, 18),
      end: UTC(year, 11, 27),
      theme: "christmas",
    },
    {
      id: "new-year-eve",
      label: "New Year",
      start: UTC(year, 11, 30),
      end: UTC(year + 1, 0, 3),
      theme: "newyear",
    },
  ];
}

/** The event window currently active, or null outside every window. */
export function getActiveEvent(now: Date = new Date()): HolidayEvent | null {
  const year = now.getUTCFullYear();
  const all = [...eventsForYear(year), ...eventsForYear(year + 1)];
  return all.find((e) => now >= e.start && now < e.end) ?? null;
}

/** Flat recurring discounts applied automatically while an event is active. */
export const EVENT_DISCOUNTS: Record<string, number> = {
  pro: 1.5,
  turbo: 2,
};

export function eventDiscountFor(planId: string, now: Date = new Date()): number {
  return getActiveEvent(now) ? (EVENT_DISCOUNTS[planId] ?? 0) : 0;
}

export const HOLIDAY_THEME_STORAGE = {
  enabled: "nextudy-holiday-theme",
  seenPrefix: "nextudy-holiday-seen-",
  event: "nextudy-holiday-change",
};

export function holidayThemeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(HOLIDAY_THEME_STORAGE.enabled) !== "false";
}

export function setHolidayThemeEnabled(enabled: boolean) {
  localStorage.setItem(HOLIDAY_THEME_STORAGE.enabled, String(enabled));
  window.dispatchEvent(new Event(HOLIDAY_THEME_STORAGE.event));
}

/** Adds/removes the holiday-* class on <html>. */
export function applyHolidayTheme(now: Date = new Date()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  Array.from(root.classList)
    .filter((c) => c.startsWith("holiday-"))
    .forEach((c) => root.classList.remove(c));
  const active = getActiveEvent(now);
  if (active && holidayThemeEnabled()) root.classList.add(`holiday-${active.theme}`);
}
