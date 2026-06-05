"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { formatDateTime } from "@/lib/format/date";

type RegistrationRow = {
  entry: { id: string; status: string; customerId: string; waitlistPosition?: number | null; registeredAt?: string };
  session?: { id: string; title?: string; startsAt: string };
  program?: { title: string };
  participantName: string;
};

export default function CustomerPortalRegistrationsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? "summit";
  const { visibleCustomerIds, registrations, sessions, programs, customers } = useCustomerPortalData();
  const now = new Date();

  const rows = useMemo<RegistrationRow[]>(() => {
    return registrations
      .filter((entry) => visibleCustomerIds.includes(entry.customerId))
      .map((entry) => {
        const session = sessions.find((item) => item.id === entry.sessionId);
        const program = session ? programs.find((item) => item.id === session.programId) : undefined;
        const participant = customers.find((item) => item.id === entry.customerId);
        return {
          entry,
          session,
          program,
          participantName: participant ? `${participant.firstName} ${participant.lastName}` : entry.customerId
        };
      })
      .sort((a, b) => (b.session?.startsAt ?? "").localeCompare(a.session?.startsAt ?? ""));
  }, [customers, programs, registrations, sessions, visibleCustomerIds]);

  const upcoming = rows.filter((row) => row.session && new Date(row.session.startsAt) >= now && row.entry.status === "confirmed");
  const waitlists = rows.filter((row) => row.entry.status === "waitlisted");
  const past = rows.filter((row) => row.session && new Date(row.session.startsAt) < now && row.entry.status !== "cancelled");
  const history = rows;

  return (
    <CustomerPortalContainer>
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold">Program Registrations</h2>
          <p className="text-sm text-muted-foreground">Upcoming registrations, waitlists, household activity, and registration history in one place.</p>
        </header>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Upcoming Registrations" value={upcoming.length} />
          <SummaryCard title="Active Waitlists" value={waitlists.length} />
          <SummaryCard title="Past Registrations" value={past.length} />
          <SummaryCard title="Registration History" value={history.length} />
        </div>

        <RegistrationSection title="Upcoming Registrations" rows={upcoming} orgSlug={orgSlug} emptyMessage="No upcoming registrations." />
        <RegistrationSection title="Waitlists" rows={waitlists} orgSlug={orgSlug} emptyMessage="No active waitlists." />
        <RegistrationSection title="Past Registrations" rows={past} orgSlug={orgSlug} emptyMessage="No past registrations yet." />
        <RegistrationSection title="Registration History" rows={history} orgSlug={orgSlug} emptyMessage="No registration history yet." />
      </section>
    </CustomerPortalContainer>
  );
}

function RegistrationSection({
  title,
  orgSlug,
  rows,
  emptyMessage
}: {
  title: string;
  orgSlug: string;
  rows: RegistrationRow[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : null}
        {rows.map((row) => (
          <div key={row.entry.id} className="rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.program?.title ?? row.session?.title ?? "Session"}</p>
                <p className="text-muted-foreground">{row.session?.startsAt ? formatDateTime(row.session.startsAt) : "No date"}</p>
                <p className="text-muted-foreground">Participant: {row.participantName}</p>
              </div>
              <Badge tone={row.entry.status === "confirmed" ? "success" : row.entry.status === "waitlisted" ? "warning" : "muted"}>
                {row.entry.status === "waitlisted" && row.entry.waitlistPosition ? `Waitlist #${row.entry.waitlistPosition}` : row.entry.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/p/${orgSlug}/registrations/${row.entry.id}`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">
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

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
