"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { formatDateTime, formatShortDate } from "@/lib/format/date";

function formatCurrency(cents: number) {
  const amount = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${amount.toFixed(2)}`;
}

export default function CustomerPortalBillingPage() {
  const {
    visibleCustomerIds,
    visibleCustomers,
    households,
    householdMembers,
    billingAccounts,
    billingCreditEntries,
    billingInvoices,
    billingStatements,
    membershipRenewals,
    billingRefunds
  } = useCustomerPortalData();

  const visibleHouseholdIds = householdMembers
    .filter((entry) => visibleCustomerIds.includes(entry.customerId))
    .map((entry) => entry.householdId);

  const accounts = billingAccounts.filter((entry) => {
    if (entry.ownerType === "customer") return visibleCustomerIds.includes(entry.ownerId);
    if (entry.ownerType === "household") return visibleHouseholdIds.includes(entry.ownerId);
    return false;
  });
  const accountIds = accounts.map((entry) => entry.id);
  const invoices = billingInvoices.filter((entry) => accountIds.includes(entry.billingAccountId));
  const statements = billingStatements.filter((entry) => accountIds.includes(entry.billingAccountId));
  const credits = billingCreditEntries.filter((entry) => accountIds.includes(entry.billingAccountId));
  const renewals = membershipRenewals.filter((entry) => visibleCustomerIds.includes(entry.customerId) || (entry.householdId ? visibleHouseholdIds.includes(entry.householdId) : false));
  const refunds = billingRefunds.filter((entry) => accountIds.includes(entry.billingAccountId));

  return (
    <CustomerPortalContainer>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">Review balances, invoices, statements, credits, renewal history, and future payment method placeholders.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-testid="customer-portal-billing-summary">
          <Card><CardHeader><CardTitle className="text-base">Balances</CardTitle></CardHeader><CardContent className="text-sm">{accounts.length === 0 ? "No billing accounts" : accounts.map((entry) => <p key={entry.id}>{formatCurrency(entry.currentBalanceCents)}</p>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Credits</CardTitle></CardHeader><CardContent className="text-sm">{formatCurrency(accounts.reduce((sum, entry) => sum + entry.availableCreditCents, 0))}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Open Invoices</CardTitle></CardHeader><CardContent className="text-sm">{invoices.filter((entry) => entry.status === "open" || entry.status === "overdue").length}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Renewals</CardTitle></CardHeader><CardContent className="text-sm">{renewals.length}</CardContent></Card>
        </div>

        <Card aria-label="portal-billing-accounts-section">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {accounts.length === 0 ? <p className="text-muted-foreground">No billing accounts available.</p> : accounts.map((account) => {
              const household = account.ownerType === "household" ? households.find((entry) => entry.id === account.ownerId) : undefined;
              const customer = account.ownerType === "customer" ? visibleCustomers.find((entry) => entry.id === account.ownerId) : undefined;
              return (
                <div key={account.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{household?.householdName ?? (customer ? `${customer.firstName} ${customer.lastName}` : account.ownerId)}</p>
                    <Badge tone={account.status === "due" ? "danger" : account.status === "credit" ? "warning" : "success"}>{account.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">Current balance {formatCurrency(account.currentBalanceCents)}</p>
                  <p className="text-muted-foreground">Available credit {formatCurrency(account.availableCreditCents)}</p>
                  <p className="text-muted-foreground">Future payment methods: {account.lastPaymentMethodLabel ?? "Not configured yet"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card aria-label="portal-billing-invoices-section">
            <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <Badge tone={invoice.status === "overdue" ? "danger" : invoice.status === "open" ? "warning" : invoice.status === "paid" ? "success" : "muted"}>{invoice.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">Issue {formatShortDate(invoice.issueDate)} · Due {formatShortDate(invoice.dueDate)}</p>
                  <p className="text-muted-foreground">Total {formatCurrency(invoice.totalCents)} · Balance {formatCurrency(invoice.balanceCents)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card aria-label="portal-billing-statements-section">
            <CardHeader><CardTitle>Statements</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {statements.map((statement) => (
                <div key={statement.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{statement.statementNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(statement.statementDate)}</p>
                  </div>
                  <p className="text-muted-foreground">Charges {formatCurrency(statement.chargesCents)} · Credits {formatCurrency(statement.creditsCents)} · Balance {formatCurrency(statement.balanceCents)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card aria-label="portal-billing-credits-section">
            <CardHeader><CardTitle>Credits & Refunds</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {credits.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <p className="font-medium">{entry.action.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">{entry.reason}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
              {refunds.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <p className="font-medium">Refund {formatCurrency(entry.amountCents)}</p>
                  <p className="text-muted-foreground">{entry.reason}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card aria-label="portal-billing-renewals-section">
            <CardHeader><CardTitle>Renewal History</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {renewals.map((renewal) => (
                <div key={renewal.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{visibleCustomers.find((entry) => entry.id === renewal.customerId)?.firstName ?? "Member"}</p>
                    <Badge tone={renewal.status === "failed" ? "danger" : renewal.status === "pending" ? "warning" : renewal.status === "succeeded" ? "success" : "muted"}>{renewal.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">Renewal date {formatShortDate(renewal.renewalDate)}</p>
                  <p className="text-muted-foreground">Amount {formatCurrency(renewal.renewalAmountCents)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </CustomerPortalContainer>
  );
}
