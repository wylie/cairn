function normalizePath(pathname: string | null | undefined) {
  if (!pathname) return "/";
  const [pathOnly] = pathname.split(/[?#]/);
  const withSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

export function isRouteActive(pathname: string | null | undefined, href: string, options: { exact?: boolean } = {}) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (current === target) return true;
  if (options.exact || target === "/") return false;
  return current.startsWith(`${target}/`);
}

export function getActiveRouteHref<T extends { href: string }>(pathname: string | null | undefined, items: T[], options: { exactHrefs?: string[] } = {}) {
  const matches = items.filter((item) => isRouteActive(pathname, item.href, { exact: options.exactHrefs?.includes(item.href) }));
  return matches.sort((a, b) => normalizePath(b.href).length - normalizePath(a.href).length)[0]?.href ?? null;
}
