"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { BellRing, Building2, LayoutDashboard, Layers3, FlaskConical, CreditCard, Settings, PlugZap, Database, Users } from "lucide-react";
import { CairnBrand } from "@/components/brand/cairn-brand";
import { Button } from "@/components/ui/button";
import { getActiveRouteHref } from "@/lib/navigation/route-matching";
import { getSessionFromCookieClient } from "@/lib/tenant/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/support", label: "Support Console", icon: BellRing },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/database", label: "Database", icon: Database },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: Layers3 },
  { href: "/admin/demo-facilities", label: "Demo Facilities", icon: FlaskConical },
  { href: "/admin/integrations", label: "Integrations", icon: PlugZap },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/platform-settings", label: "Platform Settings", icon: Settings }
];

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const session = getSessionFromCookieClient();
  const isSupportStaff = session?.kind === "support_staff";
  const visibleNavItems = useMemo(
    () => (isSupportStaff ? navItems.filter((item) => item.href === "/admin/support") : navItems),
    [isSupportStaff]
  );
  const activeHref = getActiveRouteHref(pathname, visibleNavItems, { exactHrefs: ["/admin"] });

  const handleSignOut = async () => {
    await fetch("/api/auth/mock-logout", { method: "POST" });
    window.location.assign("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[296px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <div className="shrink-0">
            <div className="flex items-center gap-3">
              <CairnBrand className="h-10 w-10" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{isSupportStaff ? "Support Staff" : "Platform Admin"}</p>
                <h1 className="text-lg font-semibold">{isSupportStaff ? "Cairn Support Console" : "Cairn Control Plane"}</h1>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSupportStaff
                ? "Assist facilities through explicit, logged support workflows."
                : "Organization provisioning, templates, demos, and platform controls."}
            </p>
          </div>
          <nav className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Platform navigation">
            {visibleNavItems.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="space-y-4">
          <header className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{isSupportStaff ? "Support Scope" : "Platform Scope"}</p>
              <p className="font-semibold">{isSupportStaff ? "Cross-facility support with explicit audit trails" : "Global administration outside facility portals"}</p>
            </div>
            <Button type="button" variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
