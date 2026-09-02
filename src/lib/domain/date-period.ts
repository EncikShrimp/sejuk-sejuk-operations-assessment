export const SUPPORTED_PERIODS = ["today", "this_week", "last_week"] as const;
export type SupportedPeriod = (typeof SUPPORTED_PERIODS)[number];

const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";
const MALAYSIA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

type CalendarDate = { year: number; month: number; day: number };

function malaysiaCalendarDate(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Malaysia has no daylight-saving transitions, so local midnight is always UTC+08:00. */
function malaysiaMidnight({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day) - MALAYSIA_UTC_OFFSET_MS);
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getPeriodBounds(period: SupportedPeriod, now = new Date()): { start: Date; end: Date } {
  const calendarToday = malaysiaCalendarDate(now);
  const today = malaysiaMidnight(calendarToday);
  const end = addUtcDays(today, 1);

  if (period === "today") return { start: today, end };

  const calendarWeekday = new Date(Date.UTC(calendarToday.year, calendarToday.month - 1, calendarToday.day)).getUTCDay();
  const weekday = (calendarWeekday + 6) % 7;
  const weekStart = addUtcDays(today, -weekday);

  if (period === "this_week") return { start: weekStart, end };

  const lastWeekEnd = weekStart;
  return { start: addUtcDays(lastWeekEnd, -7), end: lastWeekEnd };
}

export function toIsoDate(value: Date): string {
  const { year, month, day } = malaysiaCalendarDate(value);
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}
