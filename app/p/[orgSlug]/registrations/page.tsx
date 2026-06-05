"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { formatDateTime } from "@/lib/format/date";

export default function CustomerPortalRegistrationsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? "summit";
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
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Program Registrations</h2>
      <RegistrationSection title="Upcoming" rows={upcoming} orgSlug={orgSlug} />
      <RegistrationSection title="Past" rows={past} orgSlug={orgSlug} />
      <RegistrationSection title="Cancelled" rows={cancelled} orgSlug={orgSlug} />
    </section>
    </CustomerPortalContainer>
  );
}

function RegistrationSection({
  title,
  orgSlug,
  rows
}: {
  title: string;
  orgSlug: string;
  rows: Array<{
    entry: { id: string; status: string; customerId?: string };
    session?: { id: string; title?: string; startsAt: string } | undefined;
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
            <p className="text-muted-foreground">{row.session?.startsAt ? formatDateTime(row.session.startsAt) : "No date"}</p>
            <p>Status: {row.entry.status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/p/${orgSlug}/registrations/${row.entry.id}`}
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
              >
                View registration
              </Link>
              <Button variant="secondary" className="h-9">Add to calendar (Soon)</Button>
              <Button variant="secondary" className="h-9">Request cancellation (Soon)</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
