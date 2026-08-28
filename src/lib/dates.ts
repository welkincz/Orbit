import type { ISODate } from "@/types/person";

const DAY_MS = 86_400_000;

function utcDay(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`${value} is not a valid calendar date`);

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`${value} is not a valid calendar date`);
  }

  return timestamp;
}

export function isISODate(value: string): value is ISODate {
  try {
    utcDay(value);
    return true;
  } catch {
    return false;
  }
}

export function calendarDaysBetween(from: ISODate, to: ISODate): number {
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

export function todayISO(date = new Date()): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as ISODate;
}
