import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getDatabaseStatus } from "@/lib/database-status";
import { version } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function AdminDatabasePage() {
  const status = await getDatabaseStatus();
  const connected = status.status === "connected";

  return (
    <section className="space-y-4">
      <PageHeader
        title="Database"
        description={`Internal status for the v${version.currentVersion} Neon and Drizzle foundation.`}
        actions={<Badge tone={connected ? "success" : "warning"}>{status.status}</Badge>}
      />

      <p className="text-sm text-muted-foreground">Last updated: {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.checkedAt))}</p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.organizationCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Seeded tenant records available in Neon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.facilityCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Facility records associated with seeded organizations.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Staff Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.staffUserCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Database-backed staff account records.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.customerCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Customer foundation records in Neon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Households</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{status.householdCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Household foundation records in Neon.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
