import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getStaffUsers } from "@/db/repositories/staff-repository";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const staffUsers = await getStaffUsers();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Staff Directory"
        description="Read-only database-backed staff account foundation for v0.2.0."
        actions={<Badge tone="muted">{staffUsers.length} staff users</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Staff Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {staffUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff users found. Run `npm run db:seed` after migrations are applied.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Organization</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staffUsers.map((staffUser) => (
                    <tr key={staffUser.id}>
                      <td className="py-3 pr-3">
                        <p className="font-medium">{staffUser.firstName} {staffUser.lastName}</p>
                        <p className="text-xs text-muted-foreground">{staffUser.email}</p>
                      </td>
                      <td className="py-3 pr-3">{staffUser.organizationName}</td>
                      <td className="py-3 pr-3">{staffUser.roleName}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={staffUser.active ? "success" : "muted"}>{staffUser.active ? "Active" : "Inactive"}</Badge>
                      </td>
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
