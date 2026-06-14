export function parseOrgSlugFromPathname(pathname: string | null | undefined) {
  const safePathname = pathname ?? "";
  const match = safePathname.match(/^\/o\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getStaffLoginPath(pathname: string | null | undefined, fallbackSlug = "summit") {
  const orgSlug = parseOrgSlugFromPathname(pathname) ?? fallbackSlug;
  return `/o/${encodeURIComponent(orgSlug)}/login`;
}
