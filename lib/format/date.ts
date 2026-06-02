const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

function normalizeDateInput(value: Date | string) {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  return new Date(value);
}

export function formatShortDate(value?: Date | string | null, fallback = "-") {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return SHORT_DATE_FORMATTER.format(date);
}

export function formatLongDate(value?: Date | string | null, fallback = "-") {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return LONG_DATE_FORMATTER.format(date);
}

export function formatDateTime(value?: Date | string | null, fallback = "-") {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_TIME_FORMATTER.format(date);
}

export function formatTime(value?: Date | string | null, fallback = "-") {
  if (!value) return fallback;
  const date = normalizeDateInput(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return TIME_FORMATTER.format(date);
}
