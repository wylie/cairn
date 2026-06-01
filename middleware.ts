import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, decodeSession } from "@/lib/auth/session";
import { resolveOrganizationBySlug } from "@/lib/tenant/resolve";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/customers",
  "/check-in",
  "/check-ins",
  "/calendar",
  "/programs",
  "/products",
  "/pos",
  "/reports",
  "/staff",
  "/settings"
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const session = decodeSession(req.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === "/") return NextResponse.next();

  if (pathname === "/login") {
    if (session) {
      if (session.kind === "customer") {
        const org = session.organizationSlugs[0] ?? "summit";
        return NextResponse.redirect(new URL(`/p/${org}/dashboard`, req.url));
      }
      if ((session.organizationSlugs?.length ?? 0) > 1) {
        return NextResponse.redirect(new URL("/org-chooser", req.url));
      }
      const org = session.organizationSlugs[0] ?? "summit";
      return NextResponse.redirect(new URL(`/o/${org}/dashboard`, req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/org-chooser") {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (session.kind === "customer") {
      const org = session.organizationSlugs[0] ?? "summit";
      return NextResponse.redirect(new URL(`/p/${org}/dashboard`, req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/p/login") {
    if (session?.kind === "customer") {
      const org = session.organizationSlugs[0] ?? "summit";
      return NextResponse.redirect(new URL(`/p/${org}/dashboard`, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/o/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    const rest = `/${parts.slice(2).join("/")}` || "/dashboard";

    if (!resolveOrganizationBySlug(slug)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }

    if (!session || session.kind === "customer") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(loginUrl);
    }

    if (!session.organizationSlugs.includes(slug)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }

    const url = req.nextUrl.clone();
    url.pathname = rest === "/" ? "/dashboard" : rest;
    const response = NextResponse.rewrite(url);
    response.cookies.set("cairn_org_slug", slug, { path: "/", sameSite: "lax", httpOnly: false });
    return response;
  }

  if (pathname.startsWith("/p/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    if (!resolveOrganizationBySlug(slug)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }
    if (!session || session.kind !== "customer") {
      const loginUrl = new URL("/p/login", req.url);
      loginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
    if (!session.organizationSlugs.includes(slug)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }
    return NextResponse.next();
  }

  if (isProtected(pathname)) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
    const org = req.cookies.get("cairn_org_slug")?.value ?? session.organizationSlugs[0] ?? "summit";
    return NextResponse.redirect(new URL(`/o/${org}${pathname}${search}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"]
};
