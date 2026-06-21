import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataSourceInventory, getDataSourceStatusTone } from "@/lib/data-sources";
import type { DataSourceStatus } from "@/lib/data-sources";
import { version } from "@/lib/version";

const statusLegend: DataSourceStatus[] = ["Neon-backed", "Demo-backed", "Local-only", "Not Yet Migrated"];

export default function AdminDataSourcesPage() {
  const neonBackedCount = dataSourceInventory.filter((entry) => entry.status === "Neon-backed").length;
  const demoBackedCount = dataSourceInventory.filter((entry) => entry.status === "Demo-backed").length;
  const localOnlyCount = dataSourceInventory.filter((entry) => entry.status === "Local-only").length;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Data Sources"
        description={`Neon readiness inventory for v${version.currentVersion}.`}
        actions={<Badge tone="muted">{dataSourceInventory.length} modules</Badge>}
      />

      <div className="flex flex-wrap gap-2" aria-label="Data source status legend">
        {statusLegend.map((status) => (
          <Badge key={status} tone={getDataSourceStatusTone(status)}>{status}</Badge>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Neon-backed</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{neonBackedCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Modules with database schema or server repository reads in place.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Demo-backed</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{demoBackedCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Operational workflows still driven by seeded mocks and local demo state.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Local-only</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{localOnlyCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Admin, settings, or integration state that is browser-local today.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Module</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Current Source</th>
                  <th className="py-2 pr-3">Scope Audit</th>
                  <th className="py-2 pr-3">Migration Status</th>
                </tr>
              </thead>
              <tbody className="divide-y align-top">
                {dataSourceInventory.map((entry) => (
                  <tr key={entry.module}>
                    <td className="py-3 pr-3 font-medium">{entry.module}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={getDataSourceStatusTone(entry.status)}>{entry.status}</Badge>
                    </td>
                    <td className="max-w-[300px] py-3 pr-3 text-muted-foreground">{entry.currentSource}</td>
                    <td className="max-w-[300px] py-3 pr-3 text-muted-foreground">{entry.scopeAudit}</td>
                    <td className="max-w-[260px] py-3 pr-3 text-muted-foreground">{entry.migrationStatus}</td>
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
