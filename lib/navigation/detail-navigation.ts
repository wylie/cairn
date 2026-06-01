const SOURCE_LABELS: Record<string, string> = {
  "check-in": "Check-In",
  customers: "Customers",
  registrations: "Registrations",
  pos: "POS",
  calendar: "Calendar",
  reports: "Reports",
  household: "Household",
  memberships: "Memberships",
  staff: "Staff"
};

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function sourceFromPath(pathname: string) {
  const path = normalizePath(pathname);
  if (path.includes("/check-in")) return "check-in";
  if (path.includes("/customers")) return "customers";
  if (path.includes("/registrations")) return "registrations";
  if (path.includes("/pos")) return "pos";
  if (path.includes("/calendar")) return "calendar";
  if (path.includes("/reports")) return "reports";
  if (path.includes("/household")) return "household";
  if (path.includes("/memberships")) return "memberships";
  if (path.includes("/staff")) return "staff";
  return "customers";
}

export function sourceLabel(source: string | null | undefined) {
  if (!source) return "Customers";
  return SOURCE_LABELS[source] ?? "Customers";
}

export function buildCustomerDetailHref(input: {
  customerId: string;
  currentPathname: string;
  currentSearch?: string;
  sourceOverride?: string;
}) {
  const pathname = normalizePath(input.currentPathname);
  const search = input.currentSearch?.trim().replace(/^\?/, "") ?? "";
  const from = input.sourceOverride ?? sourceFromPath(pathname);
  const returnTo = `${pathname}${search ? `?${search}` : ""}`;
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("returnTo", returnTo);
  return `/customers/${input.customerId}?${params.toString()}`;
}

export function resolveDetailBackLink(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const label = sourceLabel(from);
  const requestedReturnTo = searchParams.get("returnTo");
  const safeReturnTo =
    requestedReturnTo && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/customers";
  return {
    href: safeReturnTo,
    label: `← Back to ${label}`
  };
}

