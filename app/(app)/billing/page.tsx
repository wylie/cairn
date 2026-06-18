"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/staff/permission-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatDateTime, formatShortDate } from "@/lib/format/date";
import type { BillingAccount, BillingInvoice, MembershipRenewalRecord } from "@/types/domain";

function formatCurrency(cents: number) {
  const amount = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${amount.toFixed(2)}`;
}

function accountLabel(account: BillingAccount, customers: Array<{ id: string; firstName: string; lastName: string }>, households: Array<{ id: string; householdName: string }>) {
  if (account.ownerType === "household") return households.find((entry) => entry.id === account.ownerId)?.householdName ?? account.ownerId;
  if (account.ownerType === "customer") {
    const customer = customers.find((entry) => entry.id === account.ownerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : account.ownerId;
  }
  return "Organization Account";
}

function ownerHref(account: BillingAccount, currentOrgSlug: string) {
  if (account.ownerType === "household") return `/o/${currentOrgSlug}/households/${account.ownerId}`;
  if (account.ownerType === "customer") return `/o/${currentOrgSlug}/customers/${account.ownerId}`;
  return `/o/${currentOrgSlug}/settings`;
}

function MetricCard({ title, value, hint, onClick }: { title: string; value: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs font-medium text-primary">{hint} -&gt;</p>
    </button>
  );
}

type BillingFilter = "all" | "due" | "credit" | "open_invoices" | "failed_renewals" | "refunds";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const {
    customers,
    households,
    billingAccounts,
    billingCreditEntries,
    billingInvoices,
    billingStatements,
    membershipRenewals,
    billingRefunds,
    memberships,
    adjustBillingCredit,
    createBillingStatement,
    retryMembershipRenewal,
    markBillingInvoicePaid,
    grantTemporaryAccessForRenewal,
    createBillingRefund,
    createCommunication,
    createOperationsAlert
  } = useCustomerState();
  const pathname = usePathname() ?? "";
  const { activeStaff, hasPermission } = useWorkstationState();
  const [filter, setFilter] = useState<BillingFilter>((searchParams?.get("status") as BillingFilter) || "all");
  const [feedback, setFeedback] = useState("");

  const canAccess = hasPermission("viewFinancialReports") || hasPermission("manageBillingSettings");
  const staffName = activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff";
  const slug = pathname.match(/^\/o\/([^/]+)/)?.[1] ?? "summit";

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthKey = today.slice(0, 7);
    const revenueToday = billingInvoices.filter((entry) => entry.status === "paid" && entry.updatedAt?.slice(0, 10) === today).reduce((sum, entry) => sum + entry.totalCents, 0);
    const revenueMonth = billingInvoices.filter((entry) => entry.status === "paid" && (entry.updatedAt ?? entry.createdAt).slice(0, 7) === monthKey).reduce((sum, entry) => sum + entry.totalCents, 0);
    const outstanding = billingAccounts.filter((entry) => entry.currentBalanceCents < 0).reduce((sum, entry) => sum + Math.abs(entry.currentBalanceCents), 0);
    const credits = billingAccounts.reduce((sum, entry) => sum + entry.availableCreditCents, 0);
    const upcomingRenewals = membershipRenewals.filter((entry) => entry.status === "pending").length;
    const failedPayments = membershipRenewals.filter((entry) => entry.status === "failed").length;
    const refundsMonth = billingRefunds.filter((entry) => entry.createdAt.slice(0, 7) === monthKey).reduce((sum, entry) => sum + entry.amountCents, 0);
    const storeCreditLiability = billingRefunds.filter((entry) => entry.type === "store_credit").reduce((sum, entry) => sum + entry.amountCents, 0);
    return { revenueToday, revenueMonth, outstanding, credits, upcomingRenewals, failedPayments, refundsMonth, storeCreditLiability };
  }, [billingAccounts, billingInvoices, billingRefunds, membershipRenewals]);

  const filteredAccounts = useMemo(() => {
    return billingAccounts.filter((entry) => {
      if (filter === "due") return entry.currentBalanceCents < 0;
      if (filter === "credit") return entry.availableCreditCents > 0;
      if (filter === "open_invoices") return billingInvoices.some((invoice) => invoice.billingAccountId === entry.id && (invoice.status === "open" || invoice.status === "overdue"));
      if (filter === "failed_renewals") return membershipRenewals.some((renewal) => renewal.billingAccountId === entry.id && renewal.status === "failed");
      if (filter === "refunds") return billingRefunds.some((refund) => refund.billingAccountId === entry.id);
      return true;
    });
  }, [billingAccounts, billingInvoices, billingRefunds, filter, membershipRenewals]);

  const failedRenewals = membershipRenewals.filter((entry) => entry.status === "failed");
  const visibleInvoices = billingInvoices.filter((entry) => filter !== "open_invoices" || entry.status === "open" || entry.status === "overdue");

  const remindForInvoice = (invoice: BillingInvoice) => {
    const account = billingAccounts.find((entry) => entry.id === invoice.billingAccountId);
    const household = invoice.householdId ? households.find((entry) => entry.id === invoice.householdId) : undefined;
    const customer = customers.find((entry) => entry.id === (invoice.customerId ?? account?.primaryBillingCustomerId ?? household?.billingCustomerId ?? household?.primaryContactCustomerId));
    if (!customer) {
      setFeedback("Billing contact not found.");
      return;
    }
    const result = createCommunication({
      channel: "email",
      status: "sent",
      recipientType: household ? "household" : "customer",
      recipientLabel: household?.householdName ?? `${customer.firstName} ${customer.lastName}`,
      subject: `Payment reminder for ${invoice.invoiceNumber}`,
      message: `${invoice.invoiceNumber} has ${formatCurrency(invoice.balanceCents)} remaining.`,
      customerId: customer.id,
      householdId: household?.id,
      membershipId: invoice.membershipId,
      templateType: "payment_reminder",
      source: "payment_reminder",
      createdByStaffId: activeStaff?.id,
      createdByStaffName: staffName
    });
    setFeedback(result.message);
  };

  const addCreditToAccount = (account: BillingAccount) => {
    const result = adjustBillingCredit({
      billingAccountId: account.id,
      amountCents: 2500,
      action: "add",
      reason: "Manual account credit",
      createdByStaffId: activeStaff?.id,
      createdByStaffName: staffName,
      customerId: account.ownerType === "customer" ? account.ownerId : undefined,
      householdId: account.ownerType === "household" ? account.ownerId : undefined
    });
    setFeedback(result.message);
  };

  const applyCreditToDueInvoice = (account: BillingAccount) => {
    const invoice = billingInvoices.find((entry) => entry.billingAccountId === account.id && (entry.status === "open" || entry.status === "overdue") && entry.balanceCents > 0);
    if (!invoice) {
      setFeedback("No open invoice available for credit application.");
      return;
    }
    const amountCents = Math.min(account.availableCreditCents, invoice.balanceCents);
    if (amountCents <= 0) {
      setFeedback("No available credit to apply.");
      return;
    }
    const result = adjustBillingCredit({
      billingAccountId: account.id,
      amountCents,
      action: "apply",
      reason: `Applied to ${invoice.invoiceNumber}`,
      invoiceId: invoice.id,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: staffName,
      customerId: invoice.customerId,
      householdId: invoice.householdId
    });
    setFeedback(result.ok ? `Applied ${formatCurrency(amountCents)} to ${invoice.invoiceNumber}.` : result.message);
  };

  const handleCreateStatement = (account: BillingAccount) => {
    const result = createBillingStatement({
      billingAccountId: account.id,
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      customerId: account.ownerType === "customer" ? account.ownerId : undefined,
      householdId: account.ownerType === "household" ? account.ownerId : undefined
    });
    setFeedback(result.message);
  };

  const handleFailedRenewalAlert = (renewal: MembershipRenewalRecord) => {
    const customer = customers.find((entry) => entry.id === renewal.customerId);
    const result = createOperationsAlert({
      title: "Failed payment",
      description: renewal.failureReason ?? "Renewal failed and needs review.",
      severity: "critical",
      type: "financial",
      customerId: customer?.id,
      membershipId: renewal.membershipId,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: staffName
    });
    setFeedback(result.message);
  };

  if (!canAccess) {
    return <PermissionGate permission="viewFinancialReports"><div /></PermissionGate>;
  }

  return (
    <PermissionGate permission="viewFinancialReports">
      <section className="space-y-4" data-testid="billing-workspace">
        <PageHeader title="Billing" description="Manage balances, credits, invoices, statements, recurring renewals, refunds, and payment workflow readiness." />

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Revenue Today" value={formatCurrency(metrics.revenueToday)} hint="Open revenue report" onClick={() => setFilter("all")} />
          <MetricCard title="Revenue This Month" value={formatCurrency(metrics.revenueMonth)} hint="View month activity" onClick={() => setFilter("all")} />
          <MetricCard title="Outstanding Balances" value={formatCurrency(metrics.outstanding)} hint="View due accounts" onClick={() => setFilter("due")} />
          <MetricCard title="Account Credits" value={formatCurrency(metrics.credits)} hint="View credit accounts" onClick={() => setFilter("credit")} />
          <MetricCard title="Upcoming Renewals" value={String(metrics.upcomingRenewals)} hint="View pending renewals" onClick={() => setFilter("all")} />
          <MetricCard title="Failed Payments" value={String(metrics.failedPayments)} hint="View failed renewals" onClick={() => setFilter("failed_renewals")} />
          <MetricCard title="Refunds This Month" value={formatCurrency(metrics.refundsMonth)} hint="View refund history" onClick={() => setFilter("refunds")} />
          <MetricCard title="Store Credit Liability" value={formatCurrency(metrics.storeCreditLiability)} hint="View credit liability" onClick={() => setFilter("credit")} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "due", "credit", "open_invoices", "failed_renewals", "refunds"] as BillingFilter[]).map((entry) => (
            <Button key={entry} variant={filter === entry ? "default" : "secondary"} onClick={() => setFilter(entry)}>
              {entry.replaceAll("_", " ")}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Card aria-label="billing-accounts-section">
            <CardHeader>
              <CardTitle>Billing Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredAccounts.map((account) => (
                <div key={account.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={ownerHref(account, slug)} className="font-semibold hover:text-primary">
                        {accountLabel(account, customers, households)}
                      </Link>
                      <p className="text-sm text-muted-foreground">{account.ownerType} account</p>
                    </div>
                    <Badge tone={account.status === "due" ? "danger" : account.status === "credit" ? "warning" : "success"}>{account.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Balance</p><p className="mt-1 font-medium">{formatCurrency(account.currentBalanceCents)}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Credit</p><p className="mt-1 font-medium">{formatCurrency(account.availableCreditCents)}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Methods</p><p className="mt-1 font-medium">{account.paymentMethodTypes.join(", ")}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Updated</p><p className="mt-1 font-medium">{formatDateTime(account.updatedAt ?? account.createdAt)}</p></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => addCreditToAccount(account)}>Add Credit</Button>
                    <Button variant="secondary" onClick={() => applyCreditToDueInvoice(account)}>Apply Credit</Button>
                    <Button variant="secondary" onClick={() => handleCreateStatement(account)}>Create Statement</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card aria-label="billing-renewals-section">
              <CardHeader>
                <CardTitle>Failed Renewals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {failedRenewals.length === 0 ? <p className="text-sm text-muted-foreground">No failed renewals.</p> : failedRenewals.map((renewal) => {
                  const membership = memberships.find((entry) => entry.id === renewal.membershipId);
                  return (
                    <div key={renewal.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{membership?.planName ?? renewal.membershipId}</p>
                        <Badge tone="danger">{renewal.status}</Badge>
                      </div>
                      <p className="text-muted-foreground">Renewal date {formatShortDate(renewal.renewalDate)}</p>
                      {renewal.failureReason ? <p className="text-muted-foreground">Reason: {renewal.failureReason}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setFeedback(retryMembershipRenewal(renewal.id, { createdByStaffId: activeStaff?.id, createdByStaffName: staffName }).message)}>Retry</Button>
                        {renewal.invoiceId ? <Button variant="secondary" onClick={() => setFeedback(markBillingInvoicePaid(renewal.invoiceId!, { createdByStaffId: activeStaff?.id, createdByStaffName: staffName }).message)}>Mark Paid</Button> : null}
                        <Button variant="secondary" onClick={() => setFeedback(grantTemporaryAccessForRenewal(renewal.id, "2026-06-15", { createdByStaffId: activeStaff?.id, createdByStaffName: staffName }).message)}>Grant Temporary Access</Button>
                        <Button variant="secondary" onClick={() => handleFailedRenewalAlert(renewal)}>Create Alert</Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card aria-label="billing-refunds-section">
              <CardHeader>
                <CardTitle>Refunds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {billingRefunds.map((refund) => (
                  <div key={refund.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{formatCurrency(refund.amountCents)}</p>
                      <Badge tone={refund.type === "store_credit" ? "warning" : "muted"}>{refund.type}</Badge>
                    </div>
                    <p className="text-muted-foreground">{refund.reason}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(refund.createdAt)}</p>
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setFeedback(createBillingRefund({ billingAccountId: billingAccounts[0]?.id ?? "", amountCents: 1500, type: "store_credit", reason: "Customer service credit", createdByStaffId: activeStaff?.id, createdByStaffName: staffName }).message)} disabled={!billingAccounts[0]}>Issue Store Credit</Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card aria-label="billing-invoices-section">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <Badge tone={invoice.status === "overdue" ? "danger" : invoice.status === "open" ? "warning" : invoice.status === "paid" ? "success" : "muted"}>{invoice.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">Issue {formatShortDate(invoice.issueDate)} · Due {formatShortDate(invoice.dueDate)}</p>
                  <p className="text-muted-foreground">Balance {formatCurrency(invoice.balanceCents)} · Total {formatCurrency(invoice.totalCents)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(invoice.status === "open" || invoice.status === "overdue") ? <Button variant="secondary" onClick={() => setFeedback(markBillingInvoicePaid(invoice.id, { createdByStaffId: activeStaff?.id, createdByStaffName: staffName }).message)}>Mark Paid</Button> : null}
                    {(invoice.status === "open" || invoice.status === "overdue") ? <Button variant="secondary" onClick={() => remindForInvoice(invoice)}>Send Reminder</Button> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card aria-label="billing-statements-section">
            <CardHeader>
              <CardTitle>Statements & Credit History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {billingStatements.map((statement) => (
                <div key={statement.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{statement.statementNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(statement.statementDate)}</p>
                  </div>
                  <p className="text-muted-foreground">Charges {formatCurrency(statement.chargesCents)} · Credits {formatCurrency(statement.creditsCents)} · Balance {formatCurrency(statement.balanceCents)}</p>
                </div>
              ))}
              <div className="rounded-lg border p-3">
                <p className="mb-2 font-medium">Recent Credit Activity</p>
                <div className="space-y-2">
                  {billingCreditEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">{entry.action.replaceAll("_", " ")}</p>
                        <p className="text-muted-foreground">{entry.reason}</p>
                      </div>
                      <p>{formatCurrency(entry.amountCents)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PermissionGate>
  );
}
