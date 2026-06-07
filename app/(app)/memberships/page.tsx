"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { DigitalMembershipCard } from "@/components/memberships/digital-membership-card";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { CustomerAccessRecord } from "@/types/domain";
import { buildCustomerDetailHref } from "@/lib/navigation/detail-navigation";
import { formatShortDate } from "@/lib/format/date";
import { buildMembershipCardRecord } from "@/lib/memberships/cards";

type MembershipFilter = "all" | "active" | "expiring_30" | "expiring_7" | "frozen" | "cancelled" | "expired" | "pending_renewal";

type StaffAction =
  | "renew"
  | "extend"
  | "freeze"
  | "unfreeze"
  | "cancel"
  | "change_type"
  | "move_household"
  | "add_note";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function statusLabel(record: CustomerAccessRecord): "Active" | "Expiring Soon" | "Frozen" | "Expired" | "Canceled" | "Pending Renewal" {
  const now = new Date();
  const expiration = record.expirationDate ? new Date(`${record.expirationDate}T00:00:00Z`) : null;
  const days = expiration ? Math.ceil((expiration.getTime() - now.getTime()) / ONE_DAY_MS) : null;

  if (record.status === "frozen" || record.status === "paused") return "Frozen";
  if (record.status === "cancelled") return "Canceled";
  if (record.status === "expired") return "Expired";
  if (record.status === "pending") return "Pending Renewal";
  if (days !== null && days >= 0 && days <= 30) return "Expiring Soon";
  return "Active";
}

function statusTone(label: ReturnType<typeof statusLabel>): "success" | "warning" | "danger" | "muted" {
  if (label === "Active") return "success";
  if (label === "Expiring Soon" || label === "Pending Renewal") return "warning";
  if (label === "Frozen") return "muted";
  return "danger";
}

export default function MembershipsWorkspacePage() {
  const pathname = usePathname() ?? "";
  const currentOrgSlug = pathname.match(/^\/o\/([^/]+)/)?.[1] ?? "summit";
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() ?? "";
  const { customers, customerAccessRecords, accessProducts, updateCustomerAccessRecord, households, householdMembers, operationsAlerts, billingAccounts, billingInvoices, billingStatements, membershipRenewals, billingCreditEntries } = useCustomerState();
  const { settings } = useSettingsState();
  const { activeStaff, hasPermission } = useWorkstationState();

  const canManageMemberships = hasPermission("manageProducts") || hasPermission("manageStaff") || hasPermission("manageSettings");
  const canSeeWorkspace = hasPermission("viewCustomers") || hasPermission("viewMembershipReports") || canManageMemberships;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MembershipFilter>((searchParams?.get?.("status") as MembershipFilter) || "all");
  const [selectedMembershipId, setSelectedMembershipId] = useState(searchParams?.get?.("membershipId") || "");
  const [feedback, setFeedback] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ action: StaffAction; recordId: string } | null>(null);
  const [staffNote, setStaffNote] = useState("");

  const memberships = useMemo(
    () =>
      customerAccessRecords.filter(
        (entry) =>
          entry.type === "membership" ||
          entry.type === "household-membership" ||
          entry.type === "staff-access"
      ),
    [customerAccessRecords]
  );

  const membershipRows = useMemo(() => {
    const now = new Date();
    return memberships
      .map((record) => {
        const customer = customers.find((entry) => entry.id === record.customerId);
        const product = accessProducts.find((entry) => entry.id === record.productId);
        const household = record.householdId ? households.find((entry) => entry.id === record.householdId) : undefined;
        const locationNames = (record.locationsAllowed ?? []).map(
          (id) => settings.locations.find((loc) => loc.id === id)?.name ?? id
        );
        const label = statusLabel(record);
        const expiration = record.expirationDate ? new Date(`${record.expirationDate}T00:00:00Z`) : null;
        const daysToExpiration = expiration ? Math.ceil((expiration.getTime() - now.getTime()) / ONE_DAY_MS) : null;

        return {
          record,
          customer,
          product,
          household,
          locationNames,
          label,
          daysToExpiration,
          coveredMembers: (record.coveredCustomerIds ?? [])
            .map((id) => customers.find((entry) => entry.id === id))
            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        };
      })
      .filter((entry) => Boolean(entry.customer));
  }, [memberships, customers, accessProducts, households, settings.locations]);

  const dashboard = useMemo(() => {
    const active = membershipRows.filter((entry) => entry.label === "Active").length;
    const expiring30 = membershipRows.filter((entry) => entry.daysToExpiration !== null && entry.daysToExpiration >= 0 && entry.daysToExpiration <= 30).length;
    const expiring7 = membershipRows.filter((entry) => entry.daysToExpiration !== null && entry.daysToExpiration >= 0 && entry.daysToExpiration <= 7).length;
    const frozen = membershipRows.filter((entry) => entry.label === "Frozen").length;
    const cancelled = membershipRows.filter((entry) => entry.label === "Canceled").length;
    const failedRenewals = membershipRows.filter((entry) => entry.record.status === "pending" || (entry.record.notes ?? "").toLowerCase().includes("failed renewal")).length;
    const household = membershipRows.filter((entry) => entry.record.type === "household-membership" || (entry.coveredMembers.length > 0)).length;
    const monthKey = new Date().toISOString().slice(0, 7);
    const newThisMonth = membershipRows.filter((entry) => (entry.record.purchaseDate ?? "").slice(0, 7) === monthKey).length;

    return { active, expiring30, expiring7, frozen, cancelled, failedRenewals, household, newThisMonth };
  }, [membershipRows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return membershipRows.filter((entry) => {
      const matchesFilter = (() => {
        if (filter === "all") return true;
        if (filter === "active") return entry.label === "Active";
        if (filter === "expiring_30") return entry.daysToExpiration !== null && entry.daysToExpiration >= 0 && entry.daysToExpiration <= 30;
        if (filter === "expiring_7") return entry.daysToExpiration !== null && entry.daysToExpiration >= 0 && entry.daysToExpiration <= 7;
        if (filter === "frozen") return entry.label === "Frozen";
        if (filter === "cancelled") return entry.label === "Canceled";
        if (filter === "expired") return entry.label === "Expired";
        if (filter === "pending_renewal") return entry.label === "Pending Renewal";
        return true;
      })();
      if (!matchesFilter) return false;
      if (!q) return true;

      const haystack = [
        `${entry.customer?.firstName ?? ""} ${entry.customer?.lastName ?? ""}`,
        entry.customer?.memberId ?? "",
        entry.household?.householdName ?? "",
        entry.product?.name ?? "",
        entry.record.type,
        entry.record.status
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [membershipRows, query, filter]);

  const selected = filteredRows.find((entry) => entry.record.id === selectedMembershipId) ?? filteredRows[0];

  const failedRenewals = useMemo(
    () =>
      membershipRows.filter(
        (entry) => entry.record.status === "pending" || (entry.record.notes ?? "").toLowerCase().includes("failed renewal")
      ),
    [membershipRows]
  );
  const selectedAlerts = useMemo(
    () =>
      selected
        ? operationsAlerts.filter(
            (entry) =>
              entry.membershipId === selected.record.id ||
              (entry.customerId === selected.record.customerId &&
                (entry.type === "membership" || entry.type === "financial"))
          )
        : [],
    [operationsAlerts, selected]
  );
  const selectedBillingAccount = useMemo(
    () =>
      selected
        ? billingAccounts.find(
            (entry) =>
              (selected.record.householdId && entry.ownerType === "household" && entry.ownerId === selected.record.householdId) ||
              (entry.ownerType === "customer" && entry.ownerId === selected.record.customerId)
          )
        : undefined,
    [billingAccounts, selected]
  );
  const selectedRenewals = useMemo(
    () => (selected ? membershipRenewals.filter((entry) => entry.membershipId === selected.record.id || entry.customerId === selected.record.customerId) : []),
    [membershipRenewals, selected]
  );
  const selectedInvoices = useMemo(
    () =>
      selectedBillingAccount
        ? billingInvoices.filter((entry) => entry.billingAccountId === selectedBillingAccount.id).slice(0, 4)
        : [],
    [billingInvoices, selectedBillingAccount]
  );
  const selectedStatements = useMemo(
    () =>
      selectedBillingAccount
        ? billingStatements.filter((entry) => entry.billingAccountId === selectedBillingAccount.id).slice(0, 3)
        : [],
    [billingStatements, selectedBillingAccount]
  );
  const selectedCredits = useMemo(
    () =>
      selectedBillingAccount
        ? billingCreditEntries.filter((entry) => entry.billingAccountId === selectedBillingAccount.id).slice(0, 4)
        : [],
    [billingCreditEntries, selectedBillingAccount]
  );

  const onStaffAction = (action: StaffAction, recordId: string) => {
    const record = membershipRows.find((row) => row.record.id === recordId)?.record;
    if (!record) return;

    const basePatch = {
      updatedByStaffId: activeStaff?.id,
      updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
    };

    if (action === "renew") {
      const nextRenewal = new Date(`${record.expirationDate ?? record.startDate ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      const next = nextRenewal.toISOString().slice(0, 10);
      const result = updateCustomerAccessRecord(recordId, {
        ...basePatch,
        status: "active",
        expirationDate: next,
        notes: `Renewed by ${activeStaff?.firstName ?? "staff"} ${formatShortDate(new Date())}`
      });
      setFeedback(result.message);
      return;
    }

    if (action === "extend") {
      const nextEnd = new Date(`${record.expirationDate ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
      nextEnd.setDate(nextEnd.getDate() + 30);
      const result = updateCustomerAccessRecord(recordId, {
        ...basePatch,
        expirationDate: nextEnd.toISOString().slice(0, 10),
        notes: `Extended +30 days by ${activeStaff?.firstName ?? "staff"}`
      });
      setFeedback(result.message);
      return;
    }

    if (action === "unfreeze") {
      const result = updateCustomerAccessRecord(recordId, {
        ...basePatch,
        status: "active",
        freezeStartDate: undefined,
        freezeEndDate: undefined,
        freezeReason: undefined,
        freezeStaffNotes: undefined,
        notes: `Unfrozen by ${activeStaff?.firstName ?? "staff"}`
      });
      setFeedback(result.message);
      return;
    }

    if (action === "add_note") {
      const note = staffNote.trim();
      if (!note) {
        setFeedback("Enter a staff note before saving.");
        return;
      }
      const result = updateCustomerAccessRecord(recordId, {
        ...basePatch,
        notes: `${record.notes ? `${record.notes}\n` : ""}[${formatShortDate(new Date())}] ${note}`
      });
      setStaffNote("");
      setFeedback(result.message);
      return;
    }

    setConfirmAction({ action, recordId });
  };

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    const record = membershipRows.find((row) => row.record.id === confirmAction.recordId)?.record;
    if (!record) return;
    const basePatch = {
      updatedByStaffId: activeStaff?.id,
      updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
    };

    if (confirmAction.action === "freeze") {
      const start = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 14 * ONE_DAY_MS).toISOString().slice(0, 10);
      const result = updateCustomerAccessRecord(confirmAction.recordId, {
        ...basePatch,
        status: "frozen",
        freezeStartDate: start,
        freezeEndDate: end,
        freezeReason: "Seasonal",
        freezeStaffNotes: "Set from Memberships workspace",
        notes: `Frozen ${start}–${end}`
      });
      setFeedback(result.message);
    }

    if (confirmAction.action === "cancel") {
      const result = updateCustomerAccessRecord(confirmAction.recordId, {
        ...basePatch,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        notes: `Cancelled by ${activeStaff?.firstName ?? "staff"}`
      });
      setFeedback(result.message);
    }

    if (confirmAction.action === "change_type") {
      const membershipProduct = accessProducts.find((entry) => entry.type === "membership" && entry.active);
      const result = updateCustomerAccessRecord(confirmAction.recordId, {
        ...basePatch,
        productId: membershipProduct?.id ?? record.productId,
        notes: `Membership type changed by ${activeStaff?.firstName ?? "staff"}`
      });
      setFeedback(result.message);
    }

    if (confirmAction.action === "move_household") {
      const household = households[0];
      const covered = householdMembers.filter((entry) => entry.householdId === household?.id).map((entry) => entry.customerId);
      const result = updateCustomerAccessRecord(confirmAction.recordId, {
        ...basePatch,
        householdId: household?.id,
        coveredCustomerIds: covered,
        type: covered.length > 0 ? "household-membership" : record.type,
        notes: `Moved to household ${household?.householdName ?? "Unassigned"}`
      });
      setFeedback(result.message);
    }

    setConfirmAction(null);
  };

  if (!canSeeWorkspace) {
    return (
      <section className="space-y-4">
        <PageHeader title="Memberships" description="Manage member lifecycle, renewals, and access status." />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status">
          <p>You do not have permission to view memberships.</p>
          <p className="mt-1">Ask a manager for assistance.</p>
          <div className="mt-2">
            <StaffSwitcher label="Switch Staff" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="memberships-workspace">
      <PageHeader
        title="Memberships"
        description="Operational workspace for renewals, freezes, household coverage, and lifecycle actions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/customers">
              <Button variant="secondary">Add Customer</Button>
            </Link>
            <Link href="/households">
              <Button variant="secondary">View Households</Button>
            </Link>
            <Link href="/reports?category=memberships">
              <Button variant="secondary">Open Reports</Button>
            </Link>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{feedback}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="membership-metrics">
        <MetricCard title="Active memberships" value={dashboard.active} onClick={() => setFilter("active")} />
        <MetricCard title="Expiring in 30 days" value={dashboard.expiring30} onClick={() => setFilter("expiring_30")} />
        <MetricCard title="Expiring in 7 days" value={dashboard.expiring7} onClick={() => setFilter("expiring_7")} />
        <MetricCard title="Frozen memberships" value={dashboard.frozen} onClick={() => setFilter("frozen")} />
        <MetricCard title="Canceled memberships" value={dashboard.cancelled} onClick={() => setFilter("cancelled")} />
        <MetricCard title="Failed renewals" value={dashboard.failedRenewals} onClick={() => setFilter("pending_renewal")} />
        <MetricCard title="Household memberships" value={dashboard.household} onClick={() => setFilter("all")} />
        <MetricCard title="New this month" value={dashboard.newThisMonth} onClick={() => setFilter("all")} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div className="md:col-span-2 xl:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Membership search</label>
              <SearchInput
                value={query}
                onChange={setQuery}
                label="Search memberships"
                placeholder="Customer, member ID, household, type, or status"
              />
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Status</span>
              <select
                aria-label="Membership status filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value as MembershipFilter)}
                className="h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expiring_30">Expiring Soon</option>
                <option value="expiring_7">Expiring in 7 days</option>
                <option value="frozen">Frozen</option>
                <option value="cancelled">Canceled</option>
                <option value="expired">Expired</option>
                <option value="pending_renewal">Pending Renewal</option>
              </select>
            </label>
            <div className="text-sm">
              <span className="mb-1 block text-muted-foreground">Results</span>
              <div className="flex h-11 items-center rounded-md border bg-secondary/40 px-3">{filteredRows.length}</div>
            </div>
            <div className="text-sm">
              <span className="mb-1 block text-muted-foreground">Location</span>
              <div className="flex h-11 items-center rounded-md border bg-secondary/40 px-3">{settings.locations.find((entry) => entry.isDefault)?.name ?? "All"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]" data-testid="memberships-layout">
        <Card aria-label="membership-list">
          <CardHeader>
            <CardTitle>Membership List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Membership</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">Renewal</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Billing Frequency</th>
                    <th className="px-3 py-2">Household</th>
                    <th className="px-3 py-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const selectedRow = selected?.record.id === row.record.id;
                    return (
                      <tr
                        key={row.record.id}
                        className={`cursor-pointer border-t hover:bg-secondary/20 ${selectedRow ? "bg-secondary/30" : ""}`}
                        onClick={() => setSelectedMembershipId(row.record.id)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CustomerAvatar customer={row.customer!} sizeClassName="h-8 w-8" />
                            <div>
                              <p className="font-medium">{row.customer?.firstName} {row.customer?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{row.customer?.memberId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">{row.product?.name ?? row.record.type}</td>
                        <td className="px-3 py-2"><Badge tone={statusTone(row.label)}>{row.label}</Badge></td>
                        <td className="px-3 py-2">{formatShortDate(row.record.startDate)}</td>
                        <td className="px-3 py-2">{formatShortDate(row.record.expirationDate)}</td>
                        <td className="px-3 py-2">{formatShortDate(row.record.expirationDate)}</td>
                        <td className="px-3 py-2">{row.record.type === "membership" || row.record.type === "household-membership" ? "Monthly" : "One-time"}</td>
                        <td className="px-3 py-2">{row.household?.householdName ?? "—"}</td>
                        <td className="px-3 py-2">{row.locationNames.length ? row.locationNames.join(", ") : "All"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card aria-label="membership-detail-panel">
          <CardHeader>
            <CardTitle>Membership Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selected ? (
              <p className="text-muted-foreground">Select a membership to view lifecycle details.</p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{selected.product?.name ?? selected.record.type}</p>
                  <p className="text-muted-foreground">{selected.customer?.firstName} {selected.customer?.lastName}</p>
                  <Badge tone={statusTone(selected.label)}>{selected.label}</Badge>
                </div>

                <div className="grid gap-2 rounded-lg border p-3">
                  <Field label="Member" value={`${selected.customer?.firstName} ${selected.customer?.lastName}`} />
                  <Field label="Household" value={selected.household?.householdName ?? "Not assigned"} />
                  <Field label="Membership Type" value={selected.product?.name ?? selected.record.type} />
                  <Field label="Start Date" value={formatShortDate(selected.record.startDate)} />
                  <Field label="Renewal Date" value={formatShortDate(selected.record.expirationDate)} />
                  <Field label="Expiration Date" value={formatShortDate(selected.record.expirationDate)} />
                  <Field label="Billing Frequency" value={selected.record.type === "membership" || selected.record.type === "household-membership" ? "Monthly" : "One-time"} />
                  <Field label="Location" value={selected.locationNames.length ? selected.locationNames.join(", ") : "All locations"} />
                  <Field label="Status" value={selected.label} />
                </div>

                <div className="rounded-lg border p-3" aria-label="membership-timeline">
                  <p className="mb-2 font-medium">Membership Timeline</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>Purchased • {formatShortDate(selected.record.purchaseDate ?? selected.record.startDate)}</li>
                    {selected.record.expirationDate ? <li>Renewed • {formatShortDate(selected.record.expirationDate)}</li> : null}
                    {selected.record.freezeStartDate ? <li>Frozen • {formatShortDate(selected.record.freezeStartDate)}</li> : null}
                    {selected.record.freezeEndDate ? <li>Unfrozen • {formatShortDate(selected.record.freezeEndDate)}</li> : null}
                    {selected.record.cancelledAt ? <li>Canceled • {formatShortDate(selected.record.cancelledAt)}</li> : null}
                    {selected.record.notes?.includes("changed") ? <li>Changed type • {formatShortDate(selected.record.startDate)}</li> : null}
                  </ul>
                </div>

                <div className="rounded-lg border p-3" aria-label="covered-members">
                  <div className="mb-3">
                    <DigitalMembershipCard
                      variant="compact"
                      customer={selected.customer!}
                      accessRecord={selected.record}
                      membershipName={selected.product?.name ?? "Membership"}
                      organizationName={settings.facilityProfile.facilityName}
                      organizationLogoUrl={settings.branding.logoUrl || undefined}
                      primaryColor={settings.branding.primaryColor}
                      secondaryColor={settings.branding.secondaryColor}
                      {...buildMembershipCardRecord(selected.customer!, selected.record, currentOrgSlug)}
                    />
                  </div>
                  <p className="mb-2 font-medium">Covered Members</p>
                  {selected.coveredMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No covered household members.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.coveredMembers.map((member) => (
                        <Link key={member.id} href={buildCustomerDetailHref({
                          customerId: member.id,
                          currentPathname: pathname,
                          currentSearch
                        })} className="flex items-center gap-2 rounded-md border px-2 py-1 hover:bg-secondary/30">
                          <CustomerAvatar customer={member} sizeClassName="h-8 w-8" />
                          <span>{member.firstName} {member.lastName}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-3" aria-label="membership-related-alerts">
                  <p className="mb-2 font-medium">Related Alerts</p>
                  {selectedAlerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active membership alerts for this record.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedAlerts.slice(0, 6).map((alert) => (
                        <div key={alert.id} className="rounded-md border bg-secondary/20 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{alert.title}</p>
                            <Badge tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "muted"}>
                              {alert.severity}
                            </Badge>
                          </div>
                          {alert.description ? <p className="text-xs text-muted-foreground">{alert.description}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-3" aria-label="membership-billing-section">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">Billing</p>
                    <Link href={`/o/${currentOrgSlug}/billing`} className="text-xs font-medium text-primary hover:underline">Open Billing</Link>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Renewal schedule: {selectedRenewals[0] ? `${selectedRenewals[0].billingFrequency} · ${formatShortDate(selectedRenewals[0].renewalDate)}` : "Not configured"}</p>
                    <p>Account balance: {selectedBillingAccount ? `$${Math.abs(selectedBillingAccount.currentBalanceCents / 100).toFixed(2)}` : "No billing account"}</p>
                    <p>Credits available: {selectedBillingAccount ? `$${(selectedBillingAccount.availableCreditCents / 100).toFixed(2)}` : "$0.00"}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="font-medium text-foreground">Recent Invoices</p>
                      {selectedInvoices.length === 0 ? <p className="text-xs text-muted-foreground">No invoices yet.</p> : selectedInvoices.map((invoice) => <p key={invoice.id} className="text-xs text-muted-foreground">{invoice.invoiceNumber} · {invoice.status} · {formatShortDate(invoice.dueDate)}</p>)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Statements</p>
                      {selectedStatements.length === 0 ? <p className="text-xs text-muted-foreground">No statements yet.</p> : selectedStatements.map((statement) => <p key={statement.id} className="text-xs text-muted-foreground">{statement.statementNumber} · {formatShortDate(statement.statementDate)}</p>)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Credits</p>
                      {selectedCredits.length === 0 ? <p className="text-xs text-muted-foreground">No credits recorded.</p> : selectedCredits.map((credit) => <p key={credit.id} className="text-xs text-muted-foreground">{credit.action.replaceAll("_", " ")} · ${(credit.amountCents / 100).toFixed(2)}</p>)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2" aria-label="membership-staff-actions">
                  <p className="font-medium">Staff Actions</p>
                  {!canManageMemberships ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Manager or owner permissions are required for lifecycle changes.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("renew", selected.record.id)}>Renew Membership</Button>
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("extend", selected.record.id)}>Extend +30 days</Button>
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("freeze", selected.record.id)}>Freeze Membership</Button>
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("unfreeze", selected.record.id)}>Unfreeze Membership</Button>
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("change_type", selected.record.id)}>Change Membership Type</Button>
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("move_household", selected.record.id)}>Move To Household</Button>
                        <Button variant="destructiveSubtle" className="h-9 col-span-2" onClick={() => onStaffAction("cancel", selected.record.id)}>Cancel Membership</Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground" htmlFor="membership-note">Add Staff Note</label>
                        <textarea
                          id="membership-note"
                          value={staffNote}
                          onChange={(event) => setStaffNote(event.target.value)}
                          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                        <Button variant="secondary" className="h-9" onClick={() => onStaffAction("add_note", selected.record.id)}>Add Staff Note</Button>
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <p>
                    Customer profile integration: <Link className="underline" href={`${buildCustomerDetailHref({
                      customerId: selected.customer!.id,
                      currentPathname: pathname,
                      currentSearch
                    })}#access`}>Open customer access section</Link>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card aria-label="failed-renewals-section">
        <CardHeader>
          <CardTitle>Failed Renewals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {failedRenewals.length === 0 ? (
            <p className="text-muted-foreground">No failed renewals.</p>
          ) : (
            failedRenewals.map((row) => (
              <div key={row.record.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{row.customer?.firstName} {row.customer?.lastName}</p>
                  <Badge tone="warning">Pending Renewal</Badge>
                </div>
                <p className="text-muted-foreground">{row.product?.name ?? row.record.type} • Renewal {formatShortDate(row.record.expirationDate)}</p>
                <p className="text-muted-foreground">Failure reason: {row.record.notes ?? "Payment retry required"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" className="h-9" disabled={!canManageMemberships}>Retry Payment</Button>
                  <Button variant="secondary" className="h-9" disabled={!canManageMemberships}>Update Payment Method</Button>
                  <Button
                    variant="secondary"
                    className="h-9"
                    disabled={!canManageMemberships}
                    onClick={() => {
                      const result = updateCustomerAccessRecord(row.record.id, {
                        status: "active",
                        notes: "Temporary access granted",
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      });
                      setFeedback(result.message);
                    }}
                  >
                    Grant Temporary Access
                  </Button>
                  <Button variant="secondary" className="h-9">Contact Customer</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card aria-label="membership-reports-summary">
        <CardHeader><CardTitle>Membership Reports</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <Link href="/reports?category=memberships" className="rounded-md border px-3 py-2 hover:bg-secondary/30">Active memberships</Link>
          <Link href="/reports?category=memberships" className="rounded-md border px-3 py-2 hover:bg-secondary/30">Membership growth</Link>
          <Link href="/reports?category=memberships" className="rounded-md border px-3 py-2 hover:bg-secondary/30">Churn and renewals</Link>
          <Link href="/reports?category=memberships" className="rounded-md border px-3 py-2 hover:bg-secondary/30">Freeze rate</Link>
          <Link href="/reports?category=memberships" className="rounded-md border px-3 py-2 hover:bg-secondary/30">Expirations</Link>
          <Link href="/reports?category=memberships" className="rounded-md border px-3 py-2 hover:bg-secondary/30">Household memberships</Link>
        </CardContent>
      </Card>

      <ModalShell
        open={Boolean(confirmAction)}
        ariaLabel="Membership lifecycle confirmation"
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.action === "cancel"
            ? "Cancel membership?"
            : confirmAction?.action === "freeze"
              ? "Freeze membership?"
              : confirmAction?.action === "move_household"
                ? "Move membership to household?"
                : "Confirm action"
        }
        description="This action will update the membership lifecycle and activity history."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant={confirmAction?.action === "cancel" ? "destructive" : "primary"} onClick={runConfirmedAction}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {confirmAction?.action === "freeze" && "Membership access will be disabled during the freeze window."}
          {confirmAction?.action === "cancel" && "This membership will move to canceled and no longer grant facility access."}
          {confirmAction?.action === "move_household" && "Covered members and household assignment will be updated."}
          {confirmAction?.action === "change_type" && "Membership product assignment will be changed."}
        </p>
      </ModalShell>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function MetricCard({ title, value, onClick }: { title: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-secondary/30"
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </button>
  );
}
