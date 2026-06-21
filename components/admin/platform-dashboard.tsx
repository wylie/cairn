"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";
import { cn } from "@/lib/utils";

type DatabaseStatus = {
  status: "connected" | "disconnected";
  organizationCount: number;
  facilityCount: number;
  staffUserCount: number;
  staffRoleCount: number;
  staffFacilityAccessCount: number;
  customerCount: number;
  householdCount: number;
  tableCounts: Array<{ table: string; records: number }>;
  checkedAt: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function dataModeTone(dataMode: string): "default" | "success" | "warning" | "muted" {
  if (dataMode === "production") return "success";
  if (dataMode === "sandbox") return "warning";
  if (dataMode === "demo") return "muted";
  return "default";
}

type KpiCard = {
  label: string;
  value: string;
  description: string;
  href?: string;
};

function KpiCardLink({ card }: { card: KpiCard }) {
  const content = (
    <>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{card.description}</p>
    </>
  );
  const className = cn(
    "block min-h-[128px] rounded-xl border bg-card p-4 transition",
    card.href ? "hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : ""
  );

  if (!card.href) return <div className={className}>{content}</div>;

  return (
    <Link href={card.href} className={className} aria-label={`${card.label}: ${card.value}. ${card.description}`}>
      {content}
    </Link>
  );
}

export function PlatformDashboard({ databaseStatus }: { databaseStatus: DatabaseStatus }) {
  const { organizations, demoFacilities, templates } = usePlatformAdminState();

  const active = organizations.filter((entry) => entry.status === "active").length;
  const trial = organizations.filter((entry) => entry.status === "trial").length;
  const suspended = organizations.filter((entry) => entry.status === "suspended").length;
  const totalFacilities = organizations.reduce((sum, entry) => sum + entry.stats.locations, 0);
  const totalStaff = organizations.reduce((sum, entry) => sum + entry.stats.staff, 0);
  const databaseHealthy = databaseStatus.status === "connected";
  const databaseRecordTotal = databaseStatus.tableCounts.reduce((sum, entry) => sum + entry.records, 0);

  const cards: KpiCard[] = [
    {
      label: "Organizations",
      value: String(organizations.length),
      description: "Manage tenant organizations",
      href: "/admin/organizations"
    },
    {
      label: "Facilities",
      value: String(totalFacilities),
      description: "Across all organizations",
      href: "/admin/organizations"
    },
    {
      label: "Staff Accounts",
      value: String(databaseStatus.staffUserCount || totalStaff),
      description: "Across all organizations",
      href: "/admin/staff"
    },
    {
      label: "Database Health",
      value: databaseHealthy ? "Healthy" : "Disconnected",
      description: `5 tables • ${databaseRecordTotal} records`,
      href: "/admin/database"
    },
    {
      label: "Active Organizations",
      value: String(active),
      description: "Currently active",
      href: "/admin/organizations"
    },
    {
      label: "Facility Templates",
      value: String(templates.length),
      description: "Available templates",
      href: "/admin/templates"
    },
    {
      label: "Demo Organizations",
      value: String(demoFacilities.length),
      description: "Used for evaluation",
      href: "/admin/demo-facilities"
    },
    {
      label: "Trial Organizations",
      value: String(trial),
      description: "Provisioned trial tenants",
      href: "/admin/organizations"
    },
    {
      label: "Suspended Organizations",
      value: String(suspended),
      description: "Access currently paused",
      href: "/admin/organizations"
    }
  ];

  return (
    <section className="space-y-4">
      <PageHeader title="Platform Dashboard" description="Provision facilities, review demo environments, and manage the Cairn control plane." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <KpiCardLink key={card.label} card={card} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {organizations.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{entry.name}</p>
                  <Badge tone={dataModeTone(entry.dataMode)}>{titleCase(entry.dataMode)}</Badge>
                </div>
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
