import { cookies } from "next/headers";

export const AUTH_COOKIE = "cairn_mock_auth";

export interface MockSession {
  userId: string;
  email: string;
  organizationSlugs: string[];
}

export function encodeSession(session: MockSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSession(value: string | undefined | null): MockSession | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as MockSession;
    if (!parsed?.userId || !Array.isArray(parsed.organizationSlugs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const store = await cookies();
  return decodeSession(store.get(AUTH_COOKIE)?.value);
}
