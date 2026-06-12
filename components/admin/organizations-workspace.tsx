"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PLATFORM_TEMPLATES } from "@/lib/platform-admin/registry";
import { usePlatformAdminState, getTemplatePreviewForFacilityType } from "@/lib/state/platform-admin-state";
import { formatFacilitiesIncluded, getPlanName, getSupportTierName } from "@/lib/business-model";
import type { PlatformOrganizationStatus, ProvisioningFacilityType } from "@/lib/platform-admin/registry";
import { formatDate } from "@/lib/format/date";

const FACILITY_TYPES: ProvisioningFacilityType[] = [
  "Recreation Center",
  "YMCA",
  "Climbing Gym",
  "Camp",
  "Outdoor Center",
  "Yoga Studio",
  "Fitness Facility",
  "Bike Park",
  "Community Center",
  "Custom"
];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function OrganizationsWorkspace() {
  const { organizations, createOrganization, updateOrganizationStatus } = usePlatformAdminState();
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(organizations[0]?.slug ?? "");
  const [feedback, setFeedback] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    facilityType: "Recreation Center" as ProvisioningFacilityType,
    primaryLocationName: "",
    ownerName: "",
    ownerEmail: "",
    primaryColor: "#0E9AC8",
    secondaryColor: "#1F2937",
    description: ""
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((entry) =>
      [
        entry.name,
        entry.slug,
        entry.facilityType,
        entry.ownerEmail,
        entry.primaryLocationName,
        entry.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [organizations, search]);

  const selected = filtered.find((entry) => entry.slug === selectedSlug) ?? filtered[0] ?? organizations[0];
  const templatePreview = getTemplatePreviewForFacilityType(form.facilityType);

  const handleCreate = () => {
    const result = createOrganization(form);
    setFeedback(result.message);
    if (!result.ok || !result.organization) return;
    setSelectedSlug(result.organization.slug);
    setWizardOpen(false);
    setStep(1);
    setForm({
      name: "",
      slug: "",
      facilityType: "Recreation Center",
      primaryLocationName: "",
      ownerName: "",
      ownerEmail: "",
      primaryColor: "#0E9AC8",
      secondaryColor: "#1F2937",
      description: ""
    });
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Organizations"
        description="Provision facilities, generate portals, assign starter templates, and manage tenant lifecycle."
        actions={<Button onClick={() => setWizardOpen((prev) => !prev)}>{wizardOpen ? "Close Wizard" : "New Organization"}</Button>}
      />

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      {wizardOpen ? (
        <Card aria-label="new-organization-wizard">
          <CardHeader>
            <CardTitle>New Organization Wizard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <span
                  key={value}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${step === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Step {value}
                </span>
              ))}
            </div>
            {step === 1 ? (
              <label className="block space-y-1 text-sm">
                <span>Organization Name</span>
                <Input
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm((prev) => ({ ...prev, name, slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }));
                  }}
                />
              </label>
            ) : null}
            {step === 2 ? (
              <label className="block space-y-1 text-sm">
                <span>Organization Slug</span>
                <Input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} />
              </label>
            ) : null}
            {step === 3 ? (
              <div className="space-y-3">
                <label className="block space-y-1 text-sm">
                  <span>Facility Type</span>
                  <select
                    className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                    value={form.facilityType}
                    onChange={(event) => setForm((prev) => ({ ...prev, facilityType: event.target.value as ProvisioningFacilityType }))}
                  >
                    {FACILITY_TYPES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <div className="rounded-lg border bg-secondary/20 p-3 text-sm">
                  <p className="font-medium">{templatePreview.name}</p>
                  <p className="text-muted-foreground">{templatePreview.description}</p>
                </div>
              </div>
            ) : null}
            {step === 4 ? (
              <label className="block space-y-1 text-sm">
                <span>Primary Location</span>
                <Input value={form.primaryLocationName} onChange={(event) => setForm((prev) => ({ ...prev, primaryLocationName: event.target.value }))} />
              </label>
            ) : null}
            {step === 5 ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Owner Name</span>
                  <Input value={form.ownerName} onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Owner Email</span>
                  <Input type="email" value={form.ownerEmail} onChange={(event) => setForm((prev) => ({ ...prev, ownerEmail: event.target.value }))} />
                </label>
              </div>
            ) : null}
            {step === 6 ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Primary Color</span>
                  <Input value={form.primaryColor} onChange={(event) => setForm((prev) => ({ ...prev, primaryColor: event.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Secondary Color</span>
                  <Input value={form.secondaryColor} onChange={(event) => setForm((prev) => ({ ...prev, secondaryColor: event.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm md:col-span-2">
                  <span>Organization Description</span>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep((prev) => Math.max(1, prev - 1))} disabled={step === 1}>
                Previous
              </Button>
              {step < 6 ? (
                <Button onClick={() => setStep((prev) => Math.min(6, prev + 1))}>Next</Button>
              ) : (
                <Button onClick={handleCreate}>Provision Organization</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Organization Registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Search organizations</span>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="space-y-2" aria-label="organizations-list">
              {filtered.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  onClick={() => setSelectedSlug(organization.slug)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selected?.slug === organization.slug ? "border-primary bg-primary/5" : "hover:bg-secondary/30"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{organization.name}</p>
                      <p className="text-xs text-muted-foreground">/{organization.slug} · {titleCase(organization.facilityType)}</p>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">{titleCase(organization.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {organization.stats.locations} locations · {organization.stats.members} members · {organization.stats.staff} staff
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!selected ? null : (
          <Card aria-label="organization-detail">
            <CardHeader>
              <CardTitle>{selected.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Slug" value={selected.slug} />
                <MetricCard label="Facility Type" value={titleCase(selected.facilityType)} />
                <MetricCard label="Status" value={titleCase(selected.status)} />
                <MetricCard label="Created Date" value={formatDate(selected.createdAt)} />
                <MetricCard label="Current Plan" value={getPlanName(selected.subscriptionPlan ?? "single_facility")} />
                <MetricCard label="Billing Frequency" value={titleCase(selected.billingFrequency ?? "monthly")} />
                <MetricCard label="Support Tier" value={getSupportTierName(selected.supportTier ?? "standard")} />
                <MetricCard label="Billing Status" value={titleCase(selected.billingStatus ?? "trialing")} />
                <MetricCard label="Trial Status" value={titleCase(selected.trialStatus ?? "trial")} />
                <MetricCard label="Renewal Date" value={selected.renewalDate ? formatDate(selected.renewalDate) : "Not scheduled"} />
                <MetricCard label="Locations" value={String(selected.stats.locations)} />
                <MetricCard label="Facilities Included" value={formatFacilitiesIncluded(selected.facilitiesIncluded ?? selected.stats.locations)} />
                <MetricCard label="Members" value={String(selected.stats.members)} />
                <MetricCard label="Staff" value={String(selected.stats.staff)} />
                <MetricCard label="Template" value={PLATFORM_TEMPLATES.find((entry) => entry.id === selected.templateId)?.name ?? selected.templateId} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <DetailCard title="Generated Assets">
                  <InfoLine label="Staff Portal" value={selected.generatedAssets.staffPortal} />
                  <InfoLine label="Customer Portal" value={selected.generatedAssets.customerPortal} />
                  <InfoLine label="Facility Landing Page" value={selected.generatedAssets.facilityLandingPage} />
                  <InfoLine label="Organization Settings" value={selected.generatedAssets.settingsPath} />
                </DetailCard>
                <DetailCard title="Organization Settings">
                  <InfoLine label="Primary Location" value={selected.primaryLocationName} />
                  <InfoLine label="Owner Account" value={`${selected.ownerName} · ${selected.ownerEmail}`} />
                  <InfoLine label="SEO Title" value={selected.seoTitle ?? "Not set"} />
                  <InfoLine label="Description" value={selected.description ?? "No description"} />
                </DetailCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <DetailCard title="Default Roles">
                  {selected.starterData.roles.map((role) => <p key={role}>{role}</p>)}
                </DetailCard>
                <DetailCard title="Starter Data">
                  <InfoLine label="Waivers" value={selected.starterData.waivers.join(", ")} />
                  <InfoLine label="Products" value={selected.starterData.products.join(", ")} />
                  <InfoLine label="Dashboard Widgets" value={selected.starterData.dashboardWidgets.join(", ")} />
                  <InfoLine label="Reports" value={selected.starterData.reports.join(", ")} />
                </DetailCard>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["active", "trial", "suspended", "archived"] as PlatformOrganizationStatus[]).map((status) => (
                  <Button key={status} variant="outline" className="h-9" onClick={() => setFeedback(updateOrganizationStatus(selected.slug, status).message)}>
                    Mark {titleCase(status)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 font-medium">{title}</p>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
