import { NextResponse } from "next/server";
import { AUTH_COOKIE, encodeSession } from "@/lib/auth/session";
import { findMockUser } from "@/lib/auth/mock-users";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string; orgSlug?: string } | null;
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";
  const orgSlug = body?.orgSlug?.trim();

  const user = findMockUser(email, password);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  if (orgSlug && ((user.kind ?? "staff") !== "staff" || !user.organizationSlugs.includes(orgSlug))) {
    return NextResponse.json({ ok: false, message: "This account is not authorized for this facility." }, { status: 403 });
  }

  const kind = user.kind ?? "staff";
  const response = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, organizations: user.organizationSlugs, kind } });
  response.cookies.set(AUTH_COOKIE, encodeSession({ kind, userId: user.id, email: user.email, organizationSlugs: user.organizationSlugs }), {
    path: "/",
    sameSite: "lax",
    secure: false,
    httpOnly: false
  });
  return response;
}
