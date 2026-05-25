"use client";

export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const segment = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!segment) return null;
  return decodeURIComponent(segment.split("=")[1] ?? "");
}

export function getCurrentOrgSlugClient(fallback = "summit"): string {
  return getCookieValue("cairn_org_slug") ?? fallback;
}

export function getAllowedOrgSlugsFromSessionCookie(): string[] | null {
  const raw = getCookieValue("cairn_mock_auth");
  if (!raw) return null;
  try {
    const json = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
    const parsed = JSON.parse(json) as { organizationSlugs?: string[] };
    return Array.isArray(parsed.organizationSlugs) ? parsed.organizationSlugs : null;
  } catch {
    return null;
  }
}
