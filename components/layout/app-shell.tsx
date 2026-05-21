"use client";

import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { defaultOrganization } from "@/lib/data";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[250px_1fr] lg:p-6">
        <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Facility Ops</p>
          <h1 className="mt-1 text-lg font-semibold">{defaultOrganization.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{defaultOrganization.facilityType.replace("_", " ")}</p>
          <div className="mt-5">
            <SidebarNav pathname={pathname} />
          </div>
        </aside>
        <main className="space-y-4">
          <TopBar />
          {children}
        </main>
      </div>
    </div>
  );
}
