import { sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getDatabase } from "@/db";
import { getFacilityCount } from "@/db/repositories/facility-repository";
import { getOrganizationCount } from "@/db/repositories/organization-repository";
import { getStaffUserCount } from "@/db/repositories/staff-repository";

export const dynamic = "force-dynamic";

async function getDatabaseStatus() {
  const database = getDatabase();
  if (!database) {
    return {
      status: "disconnected" as const,
      organizationCount: 0,
      facilityCount: 0,
      staffUserCount: 0,
      checkedAt: new Date().toISOString()
    };
  }

  try {
    await database.execute(sql`select 1`);
    const [organizationCount, facilityCount, staffUserCount] = await Promise.all([
      getOrganizationCount(),
      getFacilityCount(),
      getStaffUserCount()
    ]);

    return {
      status: "connected" as const,
      organizationCount,
      facilityCount,
      staffUserCount,
      checkedAt: new Date().toISOString()
    };
  } catch {
    return {
      status: "disconnected" as const,
      organizationCount: 0,
      facilityCount: 0,
      staffUserCount: 0,
      checkedAt: new Date().toISOString()
    };
  }
}

export default async function AdminDatabasePage() {
  const status = await getDatabaseStatus();
  const connected = status.status === "connected";

  return (
    <section className="space-y-4">
      <PageHeader
        title="Database"
        description="Internal status for the v0.2.0 Neon and Drizzle foundation."
        actions={<Badge tone={connected ? "success" : "warning"}>{status.status}</Badge>}
      />

      <p className="text-sm text-muted-foreground">Last updated: {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.checkedAt))}</p>

      <div className="grid gap-3 md:grid-cols-4">
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
      </div>
    </section>
  );
}
