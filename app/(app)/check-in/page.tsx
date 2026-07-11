import Link from "next/link";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getActiveAccessForCustomer } from "@/db/repositories/membership-repository";
import { searchCustomers } from "@/db/repositories/customer-repository";
import { getActiveCheckIns, getTodayCheckIns } from "@/db/repositories/check-in-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import { checkInCustomerAction, checkOutCustomerAction } from "./actions";

export const dynamic = "force-dynamic";

function formatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(date);
}

function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function CheckInPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";

  if (!context || context.source !== "database" || !context.activeFacility) {
    return (
      <section className="space-y-4" data-testid="checkin-mobile-workspace">
        <PageHeader title="Check-in" description="Scan, search, and process check-in or check-out in one step." />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Check-in is Neon-backed. Connect the database, run migrations, and seed facilities before using durable check-ins.
          </CardContent>
        </Card>
      </section>
    );
  }

  const organizationId = context.organization.id;
  const facilityId = context.activeFacility.id;
  const [results, todayRows, activeRows] = await Promise.all([
    query ? searchCustomers(organizationId, query) : searchCustomers(organizationId, ""),
    getTodayCheckIns(organizationId, facilityId),
    getActiveCheckIns(organizationId, facilityId)
  ]);
  const visibleResults = results.slice(0, 12);
  const activeCustomerIds = new Set(activeRows.map((row) => row.checkIn.customerId));
  const accessByCustomer = new Map(
    await Promise.all(
      visibleResults.map(async (customer) => [
        customer.id,
        await getActiveAccessForCustomer(customer.id, organizationId, facilityId)
      ] as const)
    )
  );

  return (
    <section className="space-y-4" data-testid="checkin-mobile-workspace">
      <PageHeader
        title="Check-in"
        description={`Neon-backed check-ins for ${context.activeFacility.name}.`}
        actions={<Link href="/memberships"><Button variant="secondary">Memberships</Button></Link>}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Currently In" value={activeRows.length} testId="occupancy-count" />
        <MetricCard title="Today's Check-Ins" value={todayRows.length} />
        <MetricCard title="Checked Out Today" value={todayRows.filter((row) => row.checkIn.checkedOutAt).length} />
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Lookup</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Scan barcode, member ID, phone, email, or search name</span>
              <input
                name="q"
                defaultValue={query}
                className="h-12 w-full rounded-md border bg-background px-3 text-base"
                placeholder="Search customer"
                aria-label="Scan barcode, member ID, phone, email, or search name"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit">Search</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Search Results</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {query.length === 0 ? (
              <EmptyState title="Start with customer search" description="Search by name, preferred name, phone, or email." />
            ) : visibleResults.length === 0 ? (
              <EmptyState title="No customers found" description="Try a different name, email, or phone number." />
            ) : (
              visibleResults.map((customer) => {
                const access = accessByCustomer.get(customer.id) ?? null;
                const checkedIn = activeCustomerIds.has(customer.id);
                return (
                  <div key={customer.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-muted-foreground">{customer.email ?? customer.phone ?? customer.memberId ?? customer.id}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={checkedIn ? "success" : access ? "success" : "warning"}>{checkedIn ? "Checked in" : access ? "Eligible" : "No active membership"}</Badge>
                          {access ? <Badge tone="muted">{access.plan.name}</Badge> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/customers/${customer.id}?from=check-in&returnTo=/check-in?q=${encodeURIComponent(query)}`}>
                          <Button variant="secondary">Profile</Button>
                        </Link>
                        {!checkedIn ? (
                          <form action={checkInCustomerAction}>
                            <input type="hidden" name="customerId" value={customer.id} />
                            <Button type="submit" disabled={!access}>Check In</Button>
                          </form>
                        ) : null}
                        {!access && !checkedIn ? (
                          <form action={checkInCustomerAction}>
                            <input type="hidden" name="customerId" value={customer.id} />
                            <input type="hidden" name="override" value="true" />
                            <input type="hidden" name="denialReason" value="Staff override without active membership" />
                            <Button type="submit" variant="secondary">Override</Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card id="current-roster">
          <CardHeader><CardTitle>Currently In</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customers are currently checked in.</p>
            ) : (
              activeRows.map((row) => (
                <div key={row.checkIn.id} className="rounded-lg border p-3" data-testid={`checkin-row-${row.customer.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                      <p className="text-sm text-muted-foreground">{row.plan?.name ?? "Membership access"} · In at {formatTime(row.checkIn.checkedInAt)}</p>
                      <p className="text-xs text-muted-foreground">Staff: {row.checkIn.checkedInByStaffName ?? "Not recorded"}</p>
                    </div>
                    <form action={checkOutCustomerAction}>
                      <input type="hidden" name="checkInId" value={row.checkIn.id} />
                      <Button type="submit" variant="secondary">Check Out</Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="recent-checkins">
        <CardHeader><CardTitle>Check-In History</CardTitle></CardHeader>
        <CardContent>
          {todayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins recorded today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Access</th>
                    <th className="px-3 py-2">In</th>
                    <th className="px-3 py-2">Out</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {todayRows.map((row) => (
                    <tr key={row.checkIn.id}>
                      <td className="px-3 py-2">{row.customer.firstName} {row.customer.lastName}</td>
                      <td className="px-3 py-2">{row.plan?.name ?? row.checkIn.denialReason ?? "Membership access"}</td>
                      <td className="px-3 py-2">{formatDateTime(row.checkIn.checkedInAt)}</td>
                      <td className="px-3 py-2">{row.checkIn.checkedOutAt ? formatDateTime(row.checkIn.checkedOutAt) : "Currently in"}</td>
                      <td className="px-3 py-2"><Badge tone={row.checkIn.status === "checked-in" ? "success" : "muted"}>{row.checkIn.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({ title, value, testId }: { title: string; value: number; testId?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold" data-testid={testId}>{value}</p>
      </CardContent>
    </Card>
  );
}
