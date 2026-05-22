"use client";

import { PermissionGate } from "@/components/staff/permission-gate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <PermissionGate permission="viewReports">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Operational and revenue insights placeholder.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Daily attendance, churn, memberships, and class utilization will render here.</p>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
