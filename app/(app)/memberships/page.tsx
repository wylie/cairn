import Link from "next/link";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getCustomersByOrganization } from "@/db/repositories/customer-repository";
import { getHouseholdsByOrganization } from "@/db/repositories/household-repository";
import {
  getMembershipPlansByOrganization,
  getMembershipsByOrganization,
  getMembershipStatusCounts,
  type MembershipWithRelations
} from "@/db/repositories/membership-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import { createMembershipAction, extendMembershipAction, setMembershipStatusAction, updateMembershipAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value?: string | Date | null) {
  if (!value) return "Not set";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function statusTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  if (status === "expired" || status === "cancelled") return "danger";
  return "muted";
}

function ownerName(row: MembershipWithRelations) {
  if (row.membership.ownerType === "household") return row.household?.name ?? "Household not found";
  return row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : "Customer not found";
}

export default async function MembershipsWorkspacePage({
  searchParams
}: {
  searchParams?: Promise<{ membershipId?: string; status?: string; q?: string; notice?: string; error?: string }>;
}) {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  const params = (await searchParams) ?? {};

  if (!context || context.source !== "database") {
    return (
      <section className="space-y-4" data-testid="memberships-workspace">
        <PageHeader title="Memberships" description="Manage member lifecycle, renewals, and access status." />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Memberships are Neon-backed. Connect the database and run migrations to manage durable membership records.
          </CardContent>
        </Card>
      </section>
    );
  }

  const organizationId = context.organization.id;
  const [plans, rows, customers, households, counts] = await Promise.all([
    getMembershipPlansByOrganization(organizationId),
    getMembershipsByOrganization(organizationId),
    getCustomersByOrganization(organizationId),
    getHouseholdsByOrganization(organizationId),
    getMembershipStatusCounts()
  ]);
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status?.trim() ?? "all";
  const filteredRows = rows.filter((row) => {
    if (statusFilter !== "all" && row.membership.status !== statusFilter) return false;
    if (!query) return true;
    return [ownerName(row), row.plan.name, row.membership.status, row.household?.name ?? "", row.customer?.memberId ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const selected = filteredRows.find((row) => row.membership.id === params.membershipId) ?? filteredRows[0] ?? null;
  const coveredMembers = selected?.membership.ownerType === "household" && selected.membership.householdId
    ? customers.filter((customer) => customer.householdId === selected.membership.householdId)
    : [];
  const today = new Date().toISOString().slice(0, 10);
  const defaultExpires = new Date();
  defaultExpires.setDate(defaultExpires.getDate() + (plans[0]?.durationDays ?? 30));

  return (
    <section className="space-y-4" data-testid="memberships-workspace">
      <PageHeader
        title="Memberships"
        description="Neon-backed membership lifecycle, household coverage, and access status."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/customers"><Button variant="secondary">Customers</Button></Link>
            <Link href="/households"><Button variant="secondary">Households</Button></Link>
            <Link href="/check-in"><Button variant="secondary">Check-In</Button></Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="membership-metrics">
        <MetricCard title="Total memberships" value={counts.total} />
        <MetricCard title="Active memberships" value={counts.active} />
        <MetricCard title="Expired memberships" value={counts.expired} />
        <MetricCard title="Suspended memberships" value={counts.suspended} />
      </div>

      {params.notice ? <StatusMessage tone="success" message={params.notice} /> : null}
      {params.error ? <StatusMessage tone="danger" message={params.error} /> : null}

      <Card>
        <CardHeader><CardTitle>Sell / Create Membership</CardTitle></CardHeader>
        <CardContent>
          <form action={createMembershipAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Plan</span>
              <select name="planId" className="h-11 w-full rounded-md border bg-background px-3" required>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Owner type</span>
              <select name="ownerType" className="h-11 w-full rounded-md border bg-background px-3" defaultValue="customer">
                <option value="customer">Customer</option>
                <option value="household">Household</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Customer</span>
              <select name="customerId" className="h-11 w-full rounded-md border bg-background px-3">
                <option value="">Select customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Household</span>
              <select name="householdId" className="h-11 w-full rounded-md border bg-background px-3">
                <option value="">No household</option>
                {households.map((household) => <option key={household.id} value={household.id}>{household.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Start date</span>
              <input name="startsOn" type="date" defaultValue={today} className="h-11 w-full rounded-md border bg-background px-3" required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Expiration date</span>
              <input name="expiresOn" type="date" defaultValue={defaultExpires.toISOString().slice(0, 10)} className="h-11 w-full rounded-md border bg-background px-3" />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-muted-foreground">Staff note</span>
              <input name="notes" className="h-11 w-full rounded-md border bg-background px-3" placeholder="Optional note" />
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit">Create Membership</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-muted-foreground">Search memberships</span>
              <input name="q" defaultValue={params.q ?? ""} className="h-11 w-full rounded-md border bg-background px-3" placeholder="Customer, household, plan, member ID" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Status</span>
              <select name="status" defaultValue={statusFilter} className="h-11 w-full rounded-md border bg-background px-3">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">Filter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]" data-testid="memberships-layout">
        <Card aria-label="membership-list">
          <CardHeader><CardTitle>Membership List</CardTitle></CardHeader>
          <CardContent className="p-0">
            {filteredRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No memberships match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">Expires</th>
                      <th className="px-3 py-2">Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((row) => (
                      <tr key={row.membership.id} className={selected?.membership.id === row.membership.id ? "bg-secondary/30" : ""}>
                        <td className="px-3 py-2">
                          <Link href={`/memberships?membershipId=${row.membership.id}`} className="font-medium hover:underline">{ownerName(row)}</Link>
                          {row.customer ? <p className="text-xs text-muted-foreground">{row.customer.memberId}</p> : null}
                        </td>
                        <td className="px-3 py-2">{row.plan.name}</td>
                        <td className="px-3 py-2"><Badge tone={statusTone(row.membership.status)}>{row.membership.status}</Badge></td>
                        <td className="px-3 py-2">{formatDate(row.membership.startsOn)}</td>
                        <td className="px-3 py-2">{formatDate(row.membership.expiresOn)}</td>
                        <td className="px-3 py-2">{row.membership.ownerType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card aria-label="membership-detail-panel">
          <CardHeader><CardTitle>Membership Detail</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!selected ? (
              <p className="text-muted-foreground">Select a membership to view details.</p>
            ) : (
              <>
                <div>
                  <p className="text-lg font-semibold">{selected.plan.name}</p>
                  <p className="text-muted-foreground">{ownerName(selected)}</p>
                  <Badge tone={statusTone(selected.membership.status)}>{selected.membership.status}</Badge>
                </div>
                <dl className="grid gap-2 rounded-lg border p-3">
                  <Field label="Owner type" value={selected.membership.ownerType} />
                  <Field label="Customer" value={selected.customer ? `${selected.customer.firstName} ${selected.customer.lastName}` : "Not assigned"} />
                  <Field label="Household" value={selected.household?.name ?? "Not assigned"} />
                  <Field label="Start" value={formatDate(selected.membership.startsOn)} />
                  <Field label="Expiration" value={formatDate(selected.membership.expiresOn)} />
                  <Field label="Notes" value={selected.membership.notes ?? "No notes"} />
                </dl>

                {selected.membership.ownerType === "household" ? (
                  <div className="rounded-lg border p-3" aria-label="covered-members">
                    <p className="font-medium">Covered household members</p>
                    {coveredMembers.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">No household members are currently linked to this household.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {coveredMembers.map((customer) => (
                          <li key={customer.id} className="flex items-center justify-between gap-3 text-sm">
                            <span>{customer.firstName} {customer.lastName}</span>
                            <Link href={`/customers/${customer.id}#access`} className="text-primary hover:underline">Profile</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <form action={updateMembershipAction} className="grid gap-3 rounded-lg border p-3">
                  <input type="hidden" name="membershipId" value={selected.membership.id} />
                  <input type="hidden" name="ownerType" value={selected.membership.ownerType} />
                  <input type="hidden" name="customerId" value={selected.membership.customerId ?? ""} />
                  <input type="hidden" name="householdId" value={selected.membership.householdId ?? ""} />
                  <input type="hidden" name="status" value={selected.membership.status} />
                  <label>
                    <span className="mb-1 block text-muted-foreground">Plan</span>
                    <select name="planId" defaultValue={selected.membership.planId} className="h-11 w-full rounded-md border bg-background px-3">
                      {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-muted-foreground">Start</span>
                    <input name="startsOn" type="date" defaultValue={selected.membership.startsOn} className="h-11 w-full rounded-md border bg-background px-3" />
                  </label>
                  <label>
                    <span className="mb-1 block text-muted-foreground">Expiration</span>
                    <input name="expiresOn" type="date" defaultValue={selected.membership.expiresOn ?? ""} className="h-11 w-full rounded-md border bg-background px-3" />
                  </label>
                  <label>
                    <span className="mb-1 block text-muted-foreground">Notes</span>
                    <textarea name="notes" defaultValue={selected.membership.notes ?? ""} className="min-h-24 w-full rounded-md border bg-background px-3 py-2" />
                  </label>
                  <Button type="submit" variant="secondary">Save Membership</Button>
                </form>

                <form action={extendMembershipAction} className="rounded-lg border p-3">
                  <input type="hidden" name="membershipId" value={selected.membership.id} />
                  <input type="hidden" name="days" value="30" />
                  <Button type="submit" variant="secondary" className="w-full">Extend 30 Days</Button>
                </form>

                <div className="grid gap-2 sm:grid-cols-2">
                  {["active", "suspended", "cancelled", "expired"].map((status) => (
                    <form key={status} action={setMembershipStatusAction}>
                      <input type="hidden" name="membershipId" value={selected.membership.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" variant={status === "cancelled" ? "destructiveSubtle" : "secondary"} className="w-full capitalize">
                        Mark {status}
                      </Button>
                    </form>
                  ))}
                </div>

                {selected.customer ? (
                  <Link href={`/customers/${selected.customer.id}#access`} className="inline-flex">
                    <Button variant="secondary">Open Customer Profile</Button>
                  </Link>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function StatusMessage({ tone, message }: { tone: "success" | "danger"; message: string }) {
  const toneClass = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-red-200 bg-red-50 text-red-900";
  return (
    <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${toneClass}`}>
      {message}
    </div>
  );
}
