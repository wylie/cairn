import type { SupportImpersonationSession } from "@/types/domain";

export const SUPPORT_SESSION_COOKIE = "cairn_support_session";

export function encodeSupportSession(session: SupportImpersonationSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSupportSession(value: string | undefined | null): SupportImpersonationSession | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SupportImpersonationSession;
    if (!parsed?.id || !parsed.supportStaffId || !parsed.organizationSlug || !parsed.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSupportSessionFromCookieClient(): SupportImpersonationSession | null {
  if (typeof document === "undefined") return null;
  const segment = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SUPPORT_SESSION_COOKIE}=`));
  if (!segment) return null;
  const raw = decodeURIComponent(segment.split("=")[1] ?? "");
  return decodeSupportSession(raw);
}

export function writeSupportSessionCookie(session: SupportImpersonationSession) {
  if (typeof document === "undefined") return;
  document.cookie = `${SUPPORT_SESSION_COOKIE}=${encodeURIComponent(encodeSupportSession(session))}; path=/; samesite=lax`;
}

export function clearSupportSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SUPPORT_SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax`;
}
