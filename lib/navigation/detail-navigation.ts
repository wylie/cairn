const SOURCE_LABELS: Record<string, string> = {
  "check-in": "Check-In",
  customers: "Customers",
  registrations: "Registrations",
  pos: "POS",
  calendar: "Calendar",
  reports: "Reports & Analytics",
  household: "Household",
  memberships: "Memberships",
  staff: "Staff",
  waivers: "Waivers",
  products: "Products"
};

type DetailDestination = "customer" | "session" | "program" | "product" | "household" | "membership" | "staff" | "receipt" | "waiver";

type BuildDetailHrefInput = {
  destination: DetailDestination;
  entityId: string;
  currentPathname: string;
  currentSearch?: string;
  currentHash?: string;
  sourceOverride?: string;
  anchor?: string;
};

type SharedDetailHrefOptions = Omit<BuildDetailHrefInput, "destination" | "entityId">;

type ResolvedBackLink = {
  href: string;
  label: string;
  source: string;
};

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function normalizeSearch(search?: string) {
  const value = search?.trim() ?? "";
  if (!value) return "";
  return value.startsWith("?") ? value : `?${value}`;
}

function normalizeHash(hash?: string) {
  const value = hash?.trim() ?? "";
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value}`;
}

function buildReturnTo(pathname: string, search?: string, hash?: string) {
  return `${normalizePath(pathname)}${normalizeSearch(search)}${normalizeHash(hash)}`;
}

function buildDestinationPath(destination: DetailDestination, entityId: string) {
  switch (destination) {
    case "customer":
      return `/customers/${entityId}`;
    case "session":
      return `/sessions/${entityId}`;
    case "program":
      return `/programs/${entityId}`;
    case "product":
      return `/products/${entityId}`;
    case "household":
      return `/households/${entityId}`;
    case "membership":
      return `/memberships/${entityId}`;
    case "staff":
      return `/staff/${entityId}`;
    case "receipt":
      return `/pos/receipts/${entityId}`;
    case "waiver":
      return `/waivers/${entityId}`;
    default:
      return `/customers/${entityId}`;
  }
}

function isSafeInternalRoute(route: string) {
  return route.startsWith("/") && !route.startsWith("//") && !/^[a-z]+:/i.test(route);
}

function parseOrgSlugFromRoute(route: string) {
  const match = route.match(/^\/[opf]\/([^/?#]+)/);
  return match?.[1] ?? null;
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
  if (path.includes("/waivers")) return "waivers";
  if (path.includes("/products")) return "products";
  return "customers";
}

export function sourceLabel(source: string | null | undefined) {
  if (!source) return "Customers";
  return SOURCE_LABELS[source] ?? "Customers";
}

export function buildDetailHref(input: BuildDetailHrefInput) {
  const pathname = normalizePath(input.currentPathname);
  const from = input.sourceOverride ?? sourceFromPath(pathname);
  const returnTo = buildReturnTo(pathname, input.currentSearch, input.currentHash);
  const contextOrg = parseOrgSlugFromRoute(returnTo);
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("fromLabel", sourceLabel(from));
  params.set("returnTo", returnTo);
  if (contextOrg) {
    params.set("contextOrg", contextOrg);
  }
  return `${buildDestinationPath(input.destination, input.entityId)}?${params.toString()}${normalizeHash(input.anchor)}`;
}

export function buildCustomerDetailHref(input: SharedDetailHrefOptions & { customerId: string }) {
  return buildDetailHref({
    destination: "customer",
    entityId: input.customerId,
    currentPathname: input.currentPathname,
    currentSearch: input.currentSearch,
    currentHash: input.currentHash,
    sourceOverride: input.sourceOverride,
    anchor: input.anchor
  });
}

export function resolveContextBackLink(
  searchParams: URLSearchParams,
  fallbackHref = "/customers",
  fallbackLabel = "Customers"
): ResolvedBackLink {
  const source = searchParams.get("from") ?? "customers";
  const requestedLabel = searchParams.get("fromLabel");
  const label = requestedLabel?.trim() || sourceLabel(source) || fallbackLabel;
  const requestedReturnTo = searchParams.get("returnTo");
  const contextOrg = searchParams.get("contextOrg");

  let href = fallbackHref;
  if (requestedReturnTo && isSafeInternalRoute(requestedReturnTo)) {
    const fallbackOrg = parseOrgSlugFromRoute(fallbackHref);
    const returnOrg = parseOrgSlugFromRoute(requestedReturnTo);
    const mismatchedFallbackOrg = fallbackOrg && returnOrg && fallbackOrg !== returnOrg;
    const mismatchedContextOrg = contextOrg && returnOrg && contextOrg !== returnOrg;
    href = mismatchedFallbackOrg || mismatchedContextOrg ? fallbackHref : requestedReturnTo;
  }

  return {
    href,
    label: `← Back to ${label}`,
    source
  };
}
