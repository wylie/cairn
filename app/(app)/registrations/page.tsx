import Link from "next/link";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/shared/page-header";
import { getCustomersByOrganization, searchCustomers } from "@/db/repositories/customer-repository";
import {
  getRegistrationsByOrganization,
  getSessionsByOrganization,
  type ProgramRegistrationWithRelations,
  type ProgramSessionWithCounts
} from "@/db/repositories/program-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import { buildCustomerDetailHref } from "@/lib/navigation/detail-navigation";
import { markRegistrationAttendanceAction, registerCustomerForSessionAction, removeRegistrationAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function statusTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "confirmed" || status === "attended") return "success";
  if (status === "waitlisted" || status === "absent") return "warning";
  if (status === "cancelled") return "danger";
  if (status === "scheduled") return "success";
  return "muted";
}

function sessionStatus(row: ProgramSessionWithCounts) {
  if (row.session.status !== "scheduled") return row.session.status;
  if (row.availableSpots > 0) return "open";
  return row.session.waitlistEnabled ? "waitlist" : "full";
}

export default async function RegistrationsPage({
  searchParams
}: {
  searchParams?: Promise<{ sessionId?: string; q?: string; notice?: string; error?: string }>;
}) {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  const params = (await searchParams) ?? {};

  if (!context || context.source !== "database") {
    return (
      <section className="space-y-4">
        <PageHeader title="Registrations" description="Registrations and waitlists are Neon-backed." />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Connect the database and run migrations to manage durable registrations.
          </CardContent>
        </Card>
      </section>
    );
  }

  const organizationId = context.organization.id;
  const query = params.q?.trim() ?? "";
  const [sessionRows, registrationRows, customerRows] = await Promise.all([
    getSessionsByOrganization(organizationId),
    getRegistrationsByOrganization(organizationId),
    query ? searchCustomers(organizationId, query) : getCustomersByOrganization(organizationId)
  ]);
  const selectedSession = sessionRows.find((row) => row.session.id === params.sessionId) ?? sessionRows[0] ?? null;
  const roster = selectedSession
    ? registrationRows.filter((row) => row.registration.sessionId === selectedSession.session.id)
    : [];
  const confirmed = roster.filter((row) => row.registration.status === "confirmed" || row.registration.status === "attended" || row.registration.status === "absent");
  const waitlisted = roster
    .filter((row) => row.registration.status === "waitlisted")
    .sort((a, b) => (a.registration.waitlistPosition ?? 999) - (b.registration.waitlistPosition ?? 999));
  const cancelled = roster.filter((row) => row.registration.status === "cancelled");
  const totalWaitlists = registrationRows.filter((row) => row.registration.status === "waitlisted").length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const registrationsToday = registrationRows.filter((row) => row.registration.registeredAt.toISOString().slice(0, 10) === todayKey).length;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Registrations"
        description="Neon-backed registration, waitlist, and attendance placeholder workflows."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/programs"><Button variant="secondary">Programs</Button></Link>
            <Link href="/customers"><Button variant="secondary">Customers</Button></Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="registration-metrics">
        <MetricCard title="Sessions" value={sessionRows.length} />
        <MetricCard title="Registrations" value={registrationRows.length} />
        <MetricCard title="Waitlists" value={totalWaitlists} />
        <MetricCard title="Registrations Today" value={registrationsToday} />
      </div>

      {params.notice ? <Notice tone="success" role="status">{params.notice}</Notice> : null}
      {params.error ? <Notice tone="danger" role="alert">{params.error}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <Card aria-label="session-selector">
          <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {sessionRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No sessions exist yet. Create sessions from Programs before registering customers.</p>
            ) : (
              <div className="divide-y">
                {sessionRows.map((row) => (
                  <Link
                    key={row.session.id}
                    href={`/registrations?sessionId=${row.session.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                    className={`block p-4 hover:bg-secondary/40 ${selectedSession?.session.id === row.session.id ? "bg-secondary/30" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.session.title || row.program.name}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(row.session.startsAt)}</p>
                      </div>
                      <Badge tone={statusTone(row.session.status)}>{sessionStatus(row)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.confirmedRegistrationCount}/{row.session.capacity} registered · {row.availableSpots} spots · {row.waitlistCount} waitlisted
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Register Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {selectedSession ? (
                <>
                  <form className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input type="hidden" name="sessionId" value={selectedSession.session.id} />
                    <label className="text-sm">
                      <span className="mb-1 block text-muted-foreground">Find customer</span>
                      <input name="q" defaultValue={query} className="h-11 w-full rounded-md border bg-background px-3" placeholder="Name, email, or phone" />
                    </label>
                    <div className="flex items-end"><Button type="submit" variant="secondary">Search</Button></div>
                  </form>
                  {customerRows.length === 0 ? (
                    <p className="rounded-md border p-3 text-sm text-muted-foreground">No customers match this search.</p>
                  ) : (
                    <div className="grid gap-2">
                      {customerRows.slice(0, 12).map((customer) => (
                        <form key={customer.id} action={registerCustomerForSessionAction} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                          <input type="hidden" name="sessionId" value={selectedSession.session.id} />
                          <input type="hidden" name="customerId" value={customer.id} />
                          <div>
                            <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                            <p className="text-sm text-muted-foreground">{customer.email ?? customer.phone ?? customer.memberId ?? "No contact info"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input name="forceWaitlist" type="checkbox" />
                              Waitlist
                            </label>
                            <Button type="submit">{selectedSession.availableSpots > 0 ? "Register" : "Join Waitlist"}</Button>
                          </div>
                        </form>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Choose or create a session before registering customers.</p>
              )}
            </CardContent>
          </Card>

          <Card aria-label="registration-roster">
            <CardHeader><CardTitle>{selectedSession ? selectedSession.session.title || selectedSession.program.name : "Roster"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {selectedSession ? (
                <>
                  <RosterSection title="Registered" rows={confirmed} empty="No confirmed registrations yet." />
                  <RosterSection title="Waitlist" rows={waitlisted} empty="No active waitlist." />
                  <RosterSection title="Cancelled" rows={cancelled} empty="No cancelled registrations." muted />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No session selected.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-semibold">{value}</p></CardContent>
    </Card>
  );
}

function RosterSection({
  title,
  rows,
  empty,
  muted = false
}: {
  title: string;
  rows: ProgramRegistrationWithRelations[];
  empty: string;
  muted?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y rounded-md border">
          {rows.map((row) => (
            <div key={row.registration.id} className={`flex flex-wrap items-center justify-between gap-3 p-3 ${muted ? "opacity-70" : ""}`}>
              <div>
                <Link href={buildCustomerDetailHref({ customerId: row.customer.id, currentPathname: "/registrations" })} className="font-medium hover:underline">
                  {row.customer.firstName} {row.customer.lastName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {row.customer.email ?? row.customer.phone ?? row.customer.memberId ?? "No contact info"} · registered {formatDateTime(row.registration.registeredAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(row.registration.status)}>
                  {row.registration.status === "waitlisted" ? `waitlist #${row.registration.waitlistPosition ?? "-"}` : row.registration.status}
                </Badge>
                {row.registration.status !== "cancelled" ? (
                  <>
                    <form action={markRegistrationAttendanceAction}>
                      <input type="hidden" name="registrationId" value={row.registration.id} />
                      <input type="hidden" name="sessionId" value={row.session.id} />
                      <input type="hidden" name="status" value="attended" />
                      <Button type="submit" variant="secondary">Attended</Button>
                    </form>
                    <form action={markRegistrationAttendanceAction}>
                      <input type="hidden" name="registrationId" value={row.registration.id} />
                      <input type="hidden" name="sessionId" value={row.session.id} />
                      <input type="hidden" name="status" value="absent" />
                      <Button type="submit" variant="secondary">Absent</Button>
                    </form>
                    <form action={removeRegistrationAction}>
                      <input type="hidden" name="registrationId" value={row.registration.id} />
                      <input type="hidden" name="sessionId" value={row.session.id} />
                      <input type="hidden" name="customerId" value={row.customer.id} />
                      <Button type="submit" variant="destructive">Remove</Button>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
