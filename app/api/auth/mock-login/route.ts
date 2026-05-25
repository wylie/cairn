import { NextResponse } from "next/server";
import { AUTH_COOKIE, encodeSession } from "@/lib/auth/session";
import { findMockUser } from "@/lib/auth/mock-users";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  const user = findMockUser(email, password);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, organizations: user.organizationSlugs } });
  response.cookies.set(AUTH_COOKIE, encodeSession({ userId: user.id, email: user.email, organizationSlugs: user.organizationSlugs }), {
    path: "/",
    sameSite: "lax",
    secure: false,
    httpOnly: false
  });
  return response;
}
