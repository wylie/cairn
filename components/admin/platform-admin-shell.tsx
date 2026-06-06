"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Layers3, FlaskConical, CreditCard, Settings, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/templates", label: "Templates", icon: Layers3 },
  { href: "/admin/demo-facilities", label: "Demo Facilities", icon: FlaskConical },
  { href: "/admin/integrations", label: "Integrations", icon: PlugZap },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/platform-settings", label: "Platform Settings", icon: Settings }
];

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";

  const handleSignOut = async () => {
    await fetch("/api/auth/mock-logout", { method: "POST" });
    window.location.assign("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:p-6">
        <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform Admin</p>
          <h1 className="mt-1 text-lg font-semibold">Cairn Control Plane</h1>
          <p className="mt-1 text-xs text-muted-foreground">Organization provisioning, templates, demos, and platform controls.</p>
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform Scope</p>
              <p className="font-semibold">Global administration outside facility portals</p>
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
