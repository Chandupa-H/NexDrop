/**
 * Shared date/time/number formatting utilities for dashboards.
 * Uses explicit locale and timeZone to prevent hydration mismatches.
 */

const LOCALE = "en-US";
const TIME_ZONE = "Asia/Colombo";

export function getDateKeyInTimeZone(
  value: string | Date,
  timeZone = TIME_ZONE
): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(typeof value === "string" ? new Date(value) : value);
  const dateParts = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function getTodayDateInTimeZone(
  now = new Date(),
  timeZone = TIME_ZONE
): string {
  return getDateKeyInTimeZone(now, timeZone);
}

export function getWeekdayInTimeZone(value: string, timeZone = TIME_ZONE): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    timeZone,
  }).format(date);
}

export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(new Date(isoDate));
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(isoDate));
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(new Date(isoDate));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function getGreeting(): string {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat(LOCALE, {
      hour: "numeric",
      hour12: false,
      timeZone: TIME_ZONE,
    }).format(now)
  );

  if (hour >= 5 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 17) return "Good afternoon,";
  return "Good evening,";
}

/**
 * Largest-remainder method to ensure percentages sum to exactly 100.
 * @param counts Array of counts to convert to percentages
 * @returns Array of integer percentages that sum to 100
 */
export function calculatePercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, c) => sum + c, 0);
  if (total === 0) return counts.map(() => 0);

  const exact = counts.map((c) => (c / total) * 100);
  const floored = exact.map(Math.floor);
  const remainders = exact.map((e, i) => e - floored[i]);

  const sum = floored.reduce((s, f) => s + f, 0);
  const diff = 100 - sum;

  // Distribute remaining 1s to the largest remainders
  const indices = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r)
    .slice(0, diff)
    .map((x) => x.i);

  indices.forEach((i) => floored[i]++);

  return floored;
}
