"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { formatDateTime } from "@/lib/format/date";
import { getSupportTierName } from "@/lib/business-model";
import { buildSeedProvisionedOrganizations } from "@/lib/platform-admin/registry";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";
import { getSupportFacilityHealthSnapshot, useSupportState } from "@/lib/state/support-state";
import { getSessionFromCookieClient } from "@/lib/tenant/client";
import type { SupportRequestCategory, SupportRequestStatus } from "@/types/domain";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

const categoryLabels: Record<SupportRequestCategory, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  confusing_workflow: "Confusing Workflow",
  question: "Question",
  general_feedback: "General Feedback"
};

const statusLabels: Record<SupportRequestStatus, string> = {
  new: "New",
  in_review: "In Review",
  planned: "Planned",
  resolved: "Resolved"
};

const categoryOptions: Array<"all" | SupportRequestCategory> = [
  "all",
  "bug_report",
  "feature_request",
  "confusing_workflow",
  "question",
  "general_feedback"
];

const statusOptions: Array<"all" | SupportRequestStatus> = ["all", "new", "in_review", "planned", "resolved"];

function statusTone(status: SupportRequestStatus) {
  if (status === "new") return "warning";
  if (status === "resolved") return "success";
  return "default";
}

function requestMatchesQuery(request: ReturnType<typeof useSupportState>["supportRequests"][number], normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return [
    request.title,
    request.description,
    request.organizationName,
    request.organizationSlug,
    request.facilityName,
    request.name,
    request.email,
    request.workflowAffected,
    request.businessImpact,
    categoryLabels[request.category],
    statusLabels[request.status]
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function SupportConsole() {
  const router = useRouter();
  const session = getSessionFromCookieClient();
  const isSupportStaff = session?.kind === "support_staff";
  const { organizations } = usePlatformAdminState();
  const {
    supportRequests,
    unresolvedRequests,
    recentProductFeedback,
    supportAuditLog,
    impersonationSessions,
    globalCustomers,
    startImpersonation,
    updateSupportRequestStatus
  } = useSupportState();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SupportRequestCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SupportRequestStatus>("all");
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const healthSnapshot = useMemo(() => {
    const liveSnapshot = getSupportFacilityHealthSnapshot();
    const source = organizations.length > 0 ? organizations : buildSeedProvisionedOrganizations();
    return liveSnapshot.map((entry) => {
      const org = source.find((organization) => organization.slug === entry.organizationSlug);
      const openTickets = unresolvedRequests.filter((request) => request.organizationSlug === entry.organizationSlug).length;
      return {
        ...entry,
        openTickets,
        generatedAssets: org?.generatedAssets,
        primaryLocationName: org?.primaryLocationName,
        members: org?.stats.members ?? entry.customerCount,
        staff: org?.stats.staff ?? 0
      };
    });
  }, [organizations, unresolvedRequests]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingFacilities = useMemo(
    () =>
      healthSnapshot.filter((entry) => {
        if (!normalizedQuery) return true;
        return [entry.organizationName, entry.organizationSlug, entry.primaryLocationName]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      }),
    [healthSnapshot, normalizedQuery]
  );

  const matchingCustomers = useMemo(
    () =>
      globalCustomers.filter((customer) => {
        if (!normalizedQuery) return true;
        return [
          `${customer.firstName} ${customer.lastName}`,
          customer.preferredName,
          customer.email,
          customer.phone,
          customer.id
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      }),
    [globalCustomers, normalizedQuery]
  );

  const filteredSupportRequests = useMemo(
    () =>
      supportRequests
        .filter((request) => {
          if (categoryFilter !== "all" && request.category !== categoryFilter) return false;
          if (statusFilter !== "all" && request.status !== statusFilter) return false;
          return requestMatchesQuery(request, normalizedQuery);
        })
        .sort((a, b) => {
          const aResolved = a.status === "resolved";
          const bResolved = b.status === "resolved";
          if (aResolved !== bResolved) return aResolved ? 1 : -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [supportRequests, categoryFilter, statusFilter, normalizedQuery]
  );

  const openAlerts = unresolvedRequests.length;
  const critical = unresolvedRequests.filter((request) => request.priority === "urgent" || request.priority === "high").length;
  const activeSessions = impersonationSessions.filter((entry) => entry.status === "active");

  const handleStartSupportSession = () => {
    const facility = healthSnapshot.find((entry) => entry.organizationSlug === selectedOrgSlug);
    if (!facility) return;
    const result = startImpersonation({
      organizationSlug: facility.organizationSlug,
      organizationName: facility.organizationName,
      facilityName: facility.primaryLocationName,
      reason
    });
    setStatusMessage(result.message);
    if (!result.ok || !result.session) return;
    setSelectedOrgSlug(null);
    setReason("");
    router.push(`/o/${result.session.organizationSlug}/dashboard`);
    router.refresh();
  };

  const metricCards = [
    { label: "Open Tickets", value: String(openAlerts), hint: "Unresolved support requests" },
    { label: "Critical", value: String(critical), hint: "High-priority issues needing follow-up" },
    { label: "Active Support Sessions", value: String(activeSessions.length), hint: "Current assisted facility sessions" },
    { label: "Product Feedback", value: String(recentProductFeedback.length), hint: "Feature requests, confusing workflows, and general feedback" }
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Support Console"
        description="Search facilities and customers globally, manage support requests, and start auditable support sessions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Search organizations, facilities, or customers"
              placeholder="Search organizations, facilities, or customers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-[280px]"
            />
          </div>
        }
      />

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <p className="font-semibold">Transparent support access</p>
        <p className="mt-1">Cairn support sessions are always logged. Facilities keep visibility into support access, reasons provided, and follow-up actions.</p>
      </div>

      {statusMessage ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">{statusMessage}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Facility Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchingFacilities.map((facility) => (
              <div key={facility.organizationSlug} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{facility.organizationName}</p>
                    <p className="text-sm text-muted-foreground">{facility.primaryLocationName ?? facility.organizationSlug}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{getSupportTierName(facility.supportTier)}</p>
                    <p className="text-muted-foreground">{facility.trialStatus}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3 xl:grid-cols-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Locations</p>
                    <p className="font-medium">{facility.facilityCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Customers</p>
                    <p className="font-medium">{formatCount(facility.customerCount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Staff</p>
                    <p className="font-medium">{formatCount(facility.staff)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Tickets</p>
                    <p className="font-medium">{facility.openTickets}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Activity</p>
                    <p className="font-medium">{formatDateTime(facility.lastActivityAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Portal</p>
                    <p className="font-medium">{facility.generatedAssets?.staffPortal ?? `/o/${facility.organizationSlug}`}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedOrgSlug(facility.organizationSlug);
                      setStatusMessage(null);
                    }}
                    disabled={!isSupportStaff}
                  >
                    Start Support Session
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push(`/f/${facility.organizationSlug}`)}>
                    View Facility Landing Page
                  </Button>
                </div>
              </div>
            ))}
            {matchingFacilities.length === 0 ? <p className="text-sm text-muted-foreground">No facilities match the current search.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div>
                <CardTitle>Feedback Inbox</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Review tester feedback by category, organization, reporter, and status.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</span>
                  <select
                    aria-label="Filter feedback category"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>{option === "all" ? "All categories" : categoryLabels[option]}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
                  <select
                    aria-label="Filter feedback status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option === "all" ? "All statuses" : statusLabels[option]}</option>
                    ))}
                  </select>
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredSupportRequests.slice(0, 8).map((request) => (
                <div key={request.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{request.title ?? categoryLabels[request.category]}</p>
                      <p className="text-muted-foreground">{request.organizationName ?? "Unscoped request"} · {request.facilityName ?? "No facility"} · {formatDateTime(request.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge tone={statusTone(request.status)}>{statusLabels[request.status]}</Badge>
                      <Badge tone={request.priority === "urgent" || request.priority === "high" ? "warning" : "muted"}>{request.priority}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{categoryLabels[request.category]}</span>
                    <span>Reporter: {request.name}</span>
                    <span>{request.email}</span>
                    {request.workflowAffected ? <span>Workflow: {request.workflowAffected}</span> : null}
                  </div>
                  <p className="mt-2 text-muted-foreground">{request.description}</p>
                  {request.businessImpact ? <p className="mt-2 text-muted-foreground">Impact: {request.businessImpact}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => updateSupportRequestStatus(request.id, "new")}>New</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => updateSupportRequestStatus(request.id, "in_review")}>In Review</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => updateSupportRequestStatus(request.id, "planned")}>Planned</Button>
                    <Button type="button" size="sm" onClick={() => updateSupportRequestStatus(request.id, "resolved")}>Resolved</Button>
                  </div>
                </div>
              ))}
              {filteredSupportRequests.length === 0 ? <p className="text-sm text-muted-foreground">No feedback matches the current filters.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Product Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {recentProductFeedback.slice(0, 5).map((request) => (
                <div key={request.id} className="rounded-xl border p-3">
                  <p className="font-medium">{request.title ?? "Product feedback"}</p>
                  <p className="text-muted-foreground">{categoryLabels[request.category]} · {request.workflowAffected ?? "General workflow"}</p>
                  {request.businessImpact ? <p className="mt-2 text-muted-foreground">Impact: {request.businessImpact}</p> : null}
                </div>
              ))}
              {recentProductFeedback.length === 0 ? <p className="text-muted-foreground">No product feedback has been submitted yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Global Customer Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {matchingCustomers.slice(0, 8).map((customer) => (
              <div key={customer.id} className="rounded-xl border p-3">
                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                <p className="text-muted-foreground">{customer.email} · {customer.phone}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{customer.organizationId}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Impersonation Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activeSessions.length === 0 ? <p className="text-muted-foreground">No active support sessions.</p> : null}
            {activeSessions.map((sessionEntry) => (
              <div key={sessionEntry.id} className="rounded-xl border p-3">
                <p className="font-medium">{sessionEntry.organizationName}</p>
                <p className="text-muted-foreground">{sessionEntry.supportStaffName} · {formatDateTime(sessionEntry.startedAt)}</p>
                <p className="mt-2 text-muted-foreground">Reason: {sessionEntry.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {supportAuditLog.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-xl border p-3">
                <p className="font-medium">{event.actionTaken.replaceAll("_", " ")}</p>
                <p className="text-muted-foreground">{event.supportStaffName} · {formatDateTime(event.timestamp)}</p>
                {event.organizationName ? <p className="text-muted-foreground">{event.organizationName}</p> : null}
                {event.reasonProvided ? <p className="mt-2 text-muted-foreground">Reason: {event.reasonProvided}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ModalShell
        open={Boolean(selectedOrgSlug)}
        onClose={() => setSelectedOrgSlug(null)}
        ariaLabel="Start support session"
        title="Start Support Session"
        description="Support staff must provide a reason before entering a facility. The facility administrator will be notified."
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSelectedOrgSlug(null)}>Cancel</Button>
            <Button type="button" onClick={handleStartSupportSession}>Start Session</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Support access is explicit and auditable</p>
            <p className="mt-1">Support staff cannot enter a facility silently. Every session records the support staff member, facility, timestamp, and reason provided.</p>
          </div>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Reason for support session</span>
            <textarea
              aria-label="Reason for support session"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe the issue you are helping with, the workflow involved, and what the facility should expect."
              className="min-h-28 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </ModalShell>
    </section>
  );
}
