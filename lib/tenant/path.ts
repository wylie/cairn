export function parseOrgSlugFromPathname(pathname: string | null | undefined) {
  const safePathname = pathname ?? "";
  const match = safePathname.match(/^\/o\/([^/]+)/);
  return match?.[1] ?? null;
}

