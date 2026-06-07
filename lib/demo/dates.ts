export function today(base = new Date()) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

export function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysAgo(days: number, base = today()) {
  return shiftDays(base, -days);
}

export function daysFromNow(days: number, base = today()) {
  return shiftDays(base, days);
}

export function shiftMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function monthsAgo(months: number, base = today()) {
  return shiftMonths(base, -months);
}

export function monthsFromNow(months: number, base = today()) {
  return shiftMonths(base, months);
}

export function shiftYears(date: Date, years: number) {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

export function yearsAgo(years: number, base = today()) {
  return shiftYears(base, -years);
}

export function startOfThisWeek(base = today()) {
  const next = new Date(base);
  const day = next.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setUTCDate(next.getUTCDate() + diff);
  return today(next);
}

export function endOfThisWeek(base = today()) {
  const next = startOfThisWeek(base);
  next.setUTCDate(next.getUTCDate() + 6);
  return next;
}

export function startOfThisMonth(base = today()) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
}

export function endOfThisMonth(base = today()) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
}

export function atUtcTime(date: Date, hours: number, minutes = 0) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes, 0, 0));
}

export function isoAt(date: Date, hours: number, minutes = 0) {
  return atUtcTime(date, hours, minutes).toISOString();
}

export function dateKeyAtOffset(offsetDays: number, base = today()) {
  return toDateKey(daysFromNow(offsetDays, base));
}

export function isoAtOffset(offsetDays: number, hours: number, minutes = 0, base = today()) {
  return isoAt(daysFromNow(offsetDays, base), hours, minutes);
}
