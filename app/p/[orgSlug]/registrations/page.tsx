"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";

export default function CustomerPortalRegistrationsPage() {
  const { visibleCustomerIds, registrations, sessions, programs } = useCustomerPortalData();
  const rows = registrations
    .filter((entry) => visibleCustomerIds.includes(entry.customerId))
    .map((entry) => {
      const session = sessions.find((item) => item.id === entry.sessionId);
      const program = session ? programs.find((item) => item.id === session.programId) : undefined;
      return { entry, session, program };
    });

  const upcoming = rows.filter((row) => row.session && row.session.startsAt >= "2026-05-20" && (row.entry.status === "confirmed" || row.entry.status === "waitlisted"));
  const past = rows.filter((row) => row.session && row.session.startsAt < "2026-05-20");
  const cancelled = rows.filter((row) => row.entry.status === "cancelled");

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Program Registrations</h2>
      <RegistrationSection title="Upcoming" rows={upcoming} />
      <RegistrationSection title="Past" rows={past} />
      <RegistrationSection title="Cancelled" rows={cancelled} />
    </section>
  );
}

function RegistrationSection({
  title,
  rows
}: {
  title: string;
  rows: Array<{
    entry: { id: string; status: string };
    session?: { title?: string; startsAt: string } | undefined;
    program?: { title: string } | undefined;
  }>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No records.</p> : null}
        {rows.map((row) => (
          <div key={row.entry.id} className="rounded-md border p-3 text-sm">
            <p className="font-medium">{row.program?.title ?? row.session?.title ?? "Session"}</p>
            <p className="text-muted-foreground">{row.session?.startsAt ? new Date(row.session.startsAt).toLocaleString("en-US") : "No date"}</p>
            <p>Status: {row.entry.status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-9">View Details</Button>
              <Button variant="secondary" className="h-9">Cancel Registration</Button>
              <Button variant="secondary" className="h-9">Transfer Request</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
