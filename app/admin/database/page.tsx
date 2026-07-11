import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getDatabaseRecordTotal, getDatabaseStatus } from "@/lib/database-status";
import { version } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function AdminDatabasePage() {
  const status = await getDatabaseStatus();
  const connected = status.status === "connected";
  const totalRecords = getDatabaseRecordTotal(status);
  const lastMigration = status.lastMigrationAt
    ? `${status.lastMigrationTag} · ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.lastMigrationAt))}`
    : "Not available";
  const lastSeedRun = status.lastSeedRunAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.lastSeedRunAt))
    : "Not recorded";
  const lastCustomerCreated = status.lastCustomerCreatedAt
    ? `${status.lastCustomerCreatedName ?? "Customer"} · ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.lastCustomerCreatedAt))}`
    : "No customer records";

  return (
    <section className="space-y-4">
      <PageHeader
        title="Database"
        description={`Internal status for the v${version.currentVersion} Neon and Drizzle foundation.`}
        actions={<Badge tone={connected ? "success" : "warning"}>{status.status}</Badge>}
      />

      <p className="text-sm text-muted-foreground">Last updated: {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.checkedAt))}</p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{connected ? "Connected" : "Disconnected"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Uses server-side `DATABASE_URL`. Credentials are not exposed to the browser.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.tableCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Known Drizzle schema tables in the Neon foundation.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalRecords}</p>
            <p className="mt-2 text-sm text-muted-foreground">Combined records across the current database-backed foundation.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Seed Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.seedDataStatus}</p>
            <p className="mt-2 text-sm text-muted-foreground">Checks core tenant, facility, staff, customer, and household seed records.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.customerCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Neon-backed customer records available to customer workflows.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Searchable Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.searchableCustomerCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Organization-scoped customer rows searchable by name, preferred name, email, and phone.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Potential Duplicate Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.potentialDuplicateCustomerPairs}</p>
            <p className="mt-2 text-sm text-muted-foreground">Exact email, phone, or name plus birth-date matches within the same organization.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Customer Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{lastCustomerCreated}</p>
            <p className="mt-2 text-sm text-muted-foreground">Newest customer profile stored in Neon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customer Seed Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.customerSeedCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Customer records defined in the committed seed dataset.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Households</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.householdCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Neon-backed household records available to household workflows.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customers in Households</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.customersAssignedToHouseholds}</p>
            <p className="mt-2 text-sm text-muted-foreground">Customer rows with a persisted household assignment.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customers Without Households</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.customersWithoutHouseholds}</p>
            <p className="mt-2 text-sm text-muted-foreground">Customer rows available for household assignment.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Migration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{lastMigration}</p>
            <p className="mt-2 text-sm text-muted-foreground">Read from the Drizzle migration journal committed in this repository.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Seed Run</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{lastSeedRun}</p>
            <p className="mt-2 text-sm text-muted-foreground">A dedicated seed-run audit table does not exist yet.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Counts by Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Table</th>
                  <th className="py-2 pr-3">Records</th>
                  <th className="py-2 pr-3">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {status.tableCounts.map((entry) => (
                  <tr key={entry.table}>
                    <td className="py-3 pr-3 font-medium">{entry.table}</td>
                    <td className="py-3 pr-3">{entry.records}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={connected && entry.records > 0 ? "success" : "muted"}>
                        {connected && entry.records > 0 ? "Seeded" : connected ? "Empty" : "Unavailable"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
