export type DateFormatPreference = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "Month D, YYYY";
export type TimeFormatPreference = "12-hour" | "24-hour";

type FormattingPreferences = {
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
};

const DEFAULT_FORMATTING_PREFERENCES: FormattingPreferences = {
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12-hour"
};

let activeFormattingPreferences: FormattingPreferences = DEFAULT_FORMATTING_PREFERENCES;

function normalizeDateInput(value: Date | string) {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  return new Date(value);
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function buildDateParts(date: Date) {
  return {
    day: pad(date.getUTCDate()),
    month: pad(date.getUTCMonth() + 1),
    year: date.getUTCFullYear().toString()
  };
}

export function setGlobalDateTimeFormatting(preferences: Partial<FormattingPreferences>) {
  activeFormattingPreferences = {
    ...activeFormattingPreferences,
    ...preferences
  };
}

export function getGlobalDateTimeFormatting() {
  return activeFormattingPreferences;
}

export function resetGlobalDateTimeFormatting() {
  activeFormattingPreferences = DEFAULT_FORMATTING_PREFERENCES;
}

export function formatDate(
  value?: Date | string | null,
  fallback = "-",
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  if (options) return new Intl.DateTimeFormat("en-US", options).format(date);

  const { day, month, year } = buildDateParts(date);
  if (activeFormattingPreferences.dateFormat === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (activeFormattingPreferences.dateFormat === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  if (activeFormattingPreferences.dateFormat === "Month D, YYYY") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }
  return `${month}/${day}/${year}`;
}

export function formatTime(
  value?: Date | string | null,
  fallback = "-",
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: activeFormattingPreferences.timeFormat === "12-hour",
    ...options
  }).format(date);
}

export function formatDateTime(value?: Date | string | null, fallback = "-") {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${formatDate(date, fallback)}, ${formatTime(date, fallback)}`;
}

export function formatDateWithAge(value?: Date | string | null, fallback = "-") {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const age = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)));
  return `${formatDate(date, fallback)} (${age})`;
}

export const formatShortDate = formatDate;
export function formatLongDate(value?: Date | string | null, fallback = "-") {
  return formatDate(value, fallback, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
