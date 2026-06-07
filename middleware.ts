import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, decodeSession } from "@/lib/auth/session";
import { resolveOrganizationBySlug } from "@/lib/tenant/resolve";
import { ORG_REGISTRY_COOKIE, parseProvisionedOrganizationsFromRequestCookie } from "@/lib/platform-admin/registry";
import { SUPPORT_SESSION_COOKIE, decodeSupportSession } from "@/lib/support/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/customers",
  "/check-in",
  "/check-ins",
  "/calendar",
  "/integrations",
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

function orgExistsForRequest(req: NextRequest, slug: string) {
  if (resolveOrganizationBySlug(slug)) return true;
  const provisioned = parseProvisionedOrganizationsFromRequestCookie(req.cookies.get(ORG_REGISTRY_COOKIE)?.value);
  return provisioned.some((entry) => entry.slug === slug);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const session = decodeSession(req.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === "/" || pathname.startsWith("/f/")) return NextResponse.next();

  if (pathname === "/login") {
    if (session) {
      if (session.kind === "platform_admin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (session.kind === "support_staff") {
        return NextResponse.redirect(new URL("/admin/support", req.url));
      }
      if (session.kind === "customer") {
        const org = session.organizationSlugs[0] ?? "summit";
        return NextResponse.redirect(new URL(`/p/${org}/account/dashboard`, req.url));
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
    if (session.kind === "platform_admin" || session.kind === "support_staff") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (session.kind === "customer") {
      const org = session.organizationSlugs[0] ?? "summit";
      return NextResponse.redirect(new URL(`/p/${org}/account/dashboard`, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (session?.kind === "platform_admin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (session?.kind === "support_staff") {
        return NextResponse.redirect(new URL("/admin/support", req.url));
      }
      return NextResponse.next();
    }
    if (session?.kind !== "platform_admin" && session?.kind !== "support_staff") {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
    if (session?.kind === "support_staff") {
      if (pathname === "/admin") {
        return NextResponse.redirect(new URL("/admin/support", req.url));
      }
      if (!pathname.startsWith("/admin/support")) {
        return NextResponse.redirect(new URL("/admin/support", req.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname === "/p/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/o/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    const rest = `/${parts.slice(2).join("/")}` || "/dashboard";

    if (!orgExistsForRequest(req, slug)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }

    if (rest === "/login") {
      if (session && session.kind === "staff" && session.organizationSlugs.includes(slug)) {
        const target = req.nextUrl.searchParams.get("next");
        if (target && target.startsWith(`/o/${slug}/`)) {
          return NextResponse.redirect(new URL(target, req.url));
        }
        return NextResponse.redirect(new URL(`/o/${slug}/dashboard`, req.url));
      }
      return NextResponse.next();
    }

    if (!session || session.kind === "customer" || session.kind === "platform_admin") {
      const loginUrl = new URL(`/o/${slug}/login`, req.url);
      loginUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(loginUrl);
    }

    if (session.kind === "support_staff") {
      const supportSession = decodeSupportSession(req.cookies.get(SUPPORT_SESSION_COOKIE)?.value);
      if (!supportSession || supportSession.organizationSlug !== slug || supportSession.status !== "active") {
        return NextResponse.redirect(new URL("/admin/support", req.url));
      }
      const url = req.nextUrl.clone();
      url.pathname = rest === "/" ? "/dashboard" : rest;
      const response = NextResponse.rewrite(url);
      response.cookies.set("cairn_org_slug", slug, { path: "/", sameSite: "lax", httpOnly: false });
      return response;
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
    const section = parts[2] ?? "";
    if (!orgExistsForRequest(req, slug)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }
    const isPublicProgramsRoute =
      section === "login" ||
      section === "programs" ||
      section === "sessions" ||
      section === "waivers" ||
      section === "kiosk";
    if (isPublicProgramsRoute) {
      if (section === "login" && session?.kind === "customer" && session.organizationSlugs.includes(slug)) {
        const target = req.nextUrl.searchParams.get("next");
        if (target && target.startsWith(`/p/${slug}/`)) {
          return NextResponse.redirect(new URL(target, req.url));
        }
        return NextResponse.redirect(new URL(`/p/${slug}/account/dashboard`, req.url));
      }
      return NextResponse.next();
    }
    if (!session || session.kind !== "customer") {
      const loginUrl = new URL(`/p/${slug}/login`, req.url);
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
