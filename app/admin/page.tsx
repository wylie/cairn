"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";

export default function PlatformAdminDashboardPage() {
  const { organizations, demoFacilities, templates } = usePlatformAdminState();

  const active = organizations.filter((entry) => entry.status === "active").length;
  const trial = organizations.filter((entry) => entry.status === "trial").length;
  const suspended = organizations.filter((entry) => entry.status === "suspended").length;
  const totalLocations = organizations.reduce((sum, entry) => sum + entry.stats.locations, 0);

  const cards = [
    { label: "Organizations", value: String(organizations.length), href: "/admin/organizations" },
    { label: "Active", value: String(active), href: "/admin/organizations" },
    { label: "Trial", value: String(trial), href: "/admin/organizations" },
    { label: "Suspended", value: String(suspended), href: "/admin/organizations" },
    { label: "Templates", value: String(templates.length), href: "/admin/templates" },
    { label: "Demo Facilities", value: String(demoFacilities.length), href: "/admin/demo-facilities" },
    { label: "Locations", value: String(totalLocations), href: "/admin/organizations" }
  ];

  return (
    <section className="space-y-4">
      <PageHeader title="Platform Dashboard" description="Provision facilities, review demo environments, and manage the Cairn control plane." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-xl border bg-card p-4 transition hover:bg-secondary/20">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {organizations.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <p className="font-medium">{entry.name}</p>
                <p className="text-muted-foreground">/{entry.slug} · {entry.primaryLocationName}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Provisioning Guarantees</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Each new organization generates staff, customer, and facility portal paths automatically.</p>
            <p>Default roles, permissions, waivers, product categories, dashboard widgets, and reports are attached from the selected template.</p>
            <p>Tenant registry is isolated by organization slug and only platform admin can provision new facilities.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
