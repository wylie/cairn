import Link from "next/link";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/shared/page-header";
import { getProgramsByOrganization, getSessionsByOrganization, type ProgramSessionWithCounts, type ProgramWithCounts } from "@/db/repositories/program-repository";
import { getStaffUsersByOrganization } from "@/db/repositories/staff-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  createProgramAction,
  createProgramSessionAction,
  deleteProgramAction,
  setProgramSessionStatusAction,
  updateProgramAction,
  updateProgramSessionAction
} from "./actions";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function dayValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeValue(value: Date) {
  return value.toISOString().slice(11, 16);
}

function statusTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "active" || status === "scheduled") return "success";
  if (status === "cancelled" || status === "inactive") return "warning";
  if (status === "archived") return "muted";
  return "muted";
}

export default async function ProgramsPage({
  searchParams
}: {
  searchParams?: Promise<{ programId?: string; sessionId?: string; notice?: string; error?: string }>;
}) {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  const params = (await searchParams) ?? {};

  if (!context || context.source !== "database") {
    return (
      <section className="space-y-4">
        <PageHeader title="Programs" description="Program catalog and sessions are Neon-backed." />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Connect the database and run migrations to manage durable program and session records.
          </CardContent>
        </Card>
      </section>
    );
  }

  const organizationId = context.organization.id;
  const [programRows, sessionRows, staffRows] = await Promise.all([
    getProgramsByOrganization(organizationId),
    getSessionsByOrganization(organizationId),
    getStaffUsersByOrganization(organizationId)
  ]);
  const selectedProgram = programRows.find((row) => row.program.id === params.programId) ?? programRows[0] ?? null;
  const selectedSessions = selectedProgram ? sessionRows.filter((row) => row.session.programId === selectedProgram.program.id) : [];
  const selectedSession = selectedSessions.find((row) => row.session.id === params.sessionId) ?? selectedSessions[0] ?? null;
  const totalRegistrations = programRows.reduce((sum, row) => sum + row.confirmedRegistrationCount, 0);
  const totalWaitlists = programRows.reduce((sum, row) => sum + row.waitlistCount, 0);
  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Programs"
        description="Neon-backed program catalog, sessions, capacity, and waitlists."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/registrations"><Button variant="secondary">Manage Registrations</Button></Link>
            <Link href="/customers"><Button variant="secondary">Customers</Button></Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="program-metrics">
        <MetricCard title="Programs" value={programRows.length} />
        <MetricCard title="Sessions" value={sessionRows.length} />
        <MetricCard title="Registrations" value={totalRegistrations} />
        <MetricCard title="Waitlists" value={totalWaitlists} />
      </div>

      {params.notice ? <Notice tone="success" role="status">{params.notice}</Notice> : null}
      {params.error ? <Notice tone="danger" role="alert">{params.error}</Notice> : null}

      <Card>
        <CardHeader><CardTitle>Create Program</CardTitle></CardHeader>
        <CardContent>
          <ProgramForm action={createProgramAction} submitLabel="Create Program" />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <Card aria-label="program-list">
          <CardHeader><CardTitle>Program Catalog</CardTitle></CardHeader>
          <CardContent className="p-0">
            {programRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No programs yet. Create the first program to start scheduling sessions.</p>
            ) : (
              <div className="divide-y">
                {programRows.map((row) => (
                  <Link
                    key={row.program.id}
                    href={`/programs?programId=${row.program.id}`}
                    className={`block p-4 hover:bg-secondary/40 ${selectedProgram?.program.id === row.program.id ? "bg-secondary/30" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.program.name}</p>
                        <p className="text-sm text-muted-foreground">{row.program.category} · capacity {row.program.capacity}</p>
                      </div>
                      <Badge tone={statusTone(row.program.status)}>{row.program.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>{row.sessionCount} sessions</span>
                      <span>{row.confirmedRegistrationCount} registered</span>
                      <span>{row.waitlistCount} waitlisted</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedProgram ? (
            <Card aria-label="program-detail">
              <CardHeader><CardTitle>Program Detail</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ProgramForm action={updateProgramAction} submitLabel="Save Program" row={selectedProgram} />
                <form action={deleteProgramAction}>
                  <input type="hidden" name="programId" value={selectedProgram.program.id} />
                  <Button type="submit" variant="destructive">Delete or Archive Program</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Create Session</CardTitle></CardHeader>
            <CardContent>
              {programRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create a program before scheduling sessions.</p>
              ) : (
                <SessionForm
                  action={createProgramSessionAction}
                  submitLabel="Create Session"
                  programs={programRows}
                  staffRows={staffRows}
                  selectedProgramId={selectedProgram?.program.id}
                  defaultStartsAt={now}
                  defaultEndsAt={defaultEnd}
                />
              )}
            </CardContent>
          </Card>

          <Card aria-label="session-list">
            <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {selectedSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions for this program yet.</p>
              ) : (
                selectedSessions.map((row) => <SessionRow key={row.session.id} row={row} selected={selectedSession?.session.id === row.session.id} programs={programRows} staffRows={staffRows} />)
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

function ProgramForm({
  action,
  submitLabel,
  row
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  row?: ProgramWithCounts;
}) {
  const program = row?.program;
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {program ? <input type="hidden" name="programId" value={program.id} /> : null}
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block text-muted-foreground">Name</span>
        <input name="name" defaultValue={program?.name ?? ""} className="h-11 w-full rounded-md border bg-background px-3" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Category</span>
        <input name="category" defaultValue={program?.category ?? "class"} className="h-11 w-full rounded-md border bg-background px-3" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Status</span>
        <select name="status" defaultValue={program?.status ?? "active"} className="h-11 w-full rounded-md border bg-background px-3">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Capacity</span>
        <input name="capacity" type="number" min="0" defaultValue={program?.capacity ?? 12} className="h-11 w-full rounded-md border bg-background px-3" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Minimum age</span>
        <input name="minimumAge" type="number" min="0" defaultValue={program?.minimumAge ?? ""} className="h-11 w-full rounded-md border bg-background px-3" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Maximum age</span>
        <input name="maximumAge" type="number" min="0" defaultValue={program?.maximumAge ?? ""} className="h-11 w-full rounded-md border bg-background px-3" />
      </label>
      <label className="flex items-end gap-2 text-sm">
        <input name="waitlistEnabled" type="checkbox" defaultChecked={program?.waitlistEnabled ?? true} className="mb-3" />
        <span className="pb-2">Waitlist enabled</span>
      </label>
      <label className="text-sm md:col-span-2 xl:col-span-4">
        <span className="mb-1 block text-muted-foreground">Description</span>
        <textarea name="description" defaultValue={program?.description ?? ""} className="min-h-24 w-full rounded-md border bg-background px-3 py-2" />
      </label>
      <div className="md:col-span-2 xl:col-span-4">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function SessionForm({
  action,
  submitLabel,
  programs,
  staffRows,
  row,
  selectedProgramId,
  defaultStartsAt,
  defaultEndsAt
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  programs: ProgramWithCounts[];
  staffRows: Array<{ id: string; firstName: string; lastName: string }>;
  row?: ProgramSessionWithCounts;
  selectedProgramId?: string;
  defaultStartsAt?: Date;
  defaultEndsAt?: Date;
}) {
  const session = row?.session;
  const startsAt = session?.startsAt ?? defaultStartsAt ?? new Date();
  const endsAt = session?.endsAt ?? defaultEndsAt ?? new Date(Date.now() + 60 * 60 * 1000);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {session ? <input type="hidden" name="sessionId" value={session.id} /> : null}
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Program</span>
        <select name="programId" defaultValue={session?.programId ?? selectedProgramId ?? programs[0]?.program.id} className="h-11 w-full rounded-md border bg-background px-3" required>
          {programs.map((entry) => <option key={entry.program.id} value={entry.program.id}>{entry.program.name}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Title</span>
        <input name="title" defaultValue={session?.title ?? ""} className="h-11 w-full rounded-md border bg-background px-3" placeholder="Optional session title" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Start date</span>
        <input name="startsOn" type="date" defaultValue={dayValue(startsAt)} className="h-11 w-full rounded-md border bg-background px-3" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Start time</span>
        <input name="startsAt" type="time" defaultValue={timeValue(startsAt)} className="h-11 w-full rounded-md border bg-background px-3" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">End date</span>
        <input name="endsOn" type="date" defaultValue={dayValue(endsAt)} className="h-11 w-full rounded-md border bg-background px-3" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">End time</span>
        <input name="endsAt" type="time" defaultValue={timeValue(endsAt)} className="h-11 w-full rounded-md border bg-background px-3" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Instructor</span>
        <select name="instructorStaffId" defaultValue={session?.instructorStaffId ?? ""} className="h-11 w-full rounded-md border bg-background px-3">
          <option value="">Unassigned</option>
          {staffRows.map((staff) => <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Instructor name</span>
        <input name="instructorName" defaultValue={session?.instructorName ?? ""} className="h-11 w-full rounded-md border bg-background px-3" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Capacity</span>
        <input name="capacity" type="number" min="0" defaultValue={session?.capacity ?? 12} className="h-11 w-full rounded-md border bg-background px-3" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Status</span>
        <select name="status" defaultValue={session?.status ?? "scheduled"} className="h-11 w-full rounded-md border bg-background px-3">
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="flex items-end gap-2 text-sm">
        <input name="waitlistEnabled" type="checkbox" defaultChecked={session?.waitlistEnabled ?? true} className="mb-3" />
        <span className="pb-2">Waitlist enabled</span>
      </label>
      <div className="flex items-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function SessionRow({
  row,
  selected,
  programs,
  staffRows
}: {
  row: ProgramSessionWithCounts;
  selected: boolean;
  programs: ProgramWithCounts[];
  staffRows: Array<{ id: string; firstName: string; lastName: string }>;
}) {
  return (
    <div className={`rounded-md border p-3 ${selected ? "bg-secondary/30" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{row.session.title || row.program.name}</p>
          <p className="text-sm text-muted-foreground">{formatDateTime(row.session.startsAt)} · {row.session.instructorName ?? "Unassigned"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.confirmedRegistrationCount}/{row.session.capacity} registered · {row.availableSpots} spots available · {row.waitlistCount} waitlisted
          </p>
        </div>
        <Badge tone={statusTone(row.session.status)}>{row.session.status}</Badge>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium">Edit session</summary>
        <div className="mt-3">
          <SessionForm action={updateProgramSessionAction} submitLabel="Save Session" programs={programs} staffRows={staffRows} row={row} />
        </div>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={setProgramSessionStatusAction}>
          <input type="hidden" name="sessionId" value={row.session.id} />
          <input type="hidden" name="status" value="cancelled" />
          <Button type="submit" variant="secondary">Cancel Session</Button>
        </form>
        <form action={setProgramSessionStatusAction}>
          <input type="hidden" name="sessionId" value={row.session.id} />
          <input type="hidden" name="status" value="archived" />
          <Button type="submit" variant="secondary">Archive Session</Button>
        </form>
        {row.session.status !== "scheduled" ? (
          <form action={setProgramSessionStatusAction}>
            <input type="hidden" name="sessionId" value={row.session.id} />
            <input type="hidden" name="status" value="scheduled" />
            <Button type="submit" variant="secondary">Reopen Session</Button>
          </form>
        ) : null}
        <Link href={`/registrations?sessionId=${row.session.id}`}>
          <Button variant="secondary">Roster</Button>
        </Link>
      </div>
    </div>
  );
}
