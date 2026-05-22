"use client";

import { useMemo, useState } from "react";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { ProgramCatalog } from "@/components/programs/program-catalog";
import { RegistrationList } from "@/components/programs/registration-list";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { SessionSearchCombobox, type SessionSearchResult } from "@/components/shared/session-search-combobox";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { filterCustomers } from "@/lib/data/customer-search";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

export default function ProgramsPage() {
  const { programs, sessions, registrations, customers, createSession, registerCustomerForSession, addCustomer } = useCustomerState();
  const { activeStaff, requestStaffSwitch } = useWorkstationState();
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [registrationSessionId, setRegistrationSessionId] = useState("");
  const [registrationSessionQuery, setRegistrationSessionQuery] = useState("");
  const [registrationCustomerId, setRegistrationCustomerId] = useState<string | null>(null);
  const [registrationCustomerQuery, setRegistrationCustomerQuery] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");

  const sessionsWithProgram = useMemo(
    () =>
      sessions
        .map((session) => ({ session, program: programs.find((entry) => entry.id === session.programId) }))
        .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt)),
    [sessions, programs]
  );
  const sessionSearchResults = useMemo<SessionSearchResult[]>(
    () =>
      sessionsWithProgram.map(({ session, program }) => ({
        id: session.id,
        title: program?.title ?? "Unknown program",
        category: program?.category ?? "class",
        startsAt: session.startsAt,
        capacity: session.capacity,
        enrolled: session.enrolled,
        isWaitlisted: session.enrolled >= session.capacity
      })),
    [sessionsWithProgram]
  );
  const filteredSessionResults = useMemo(() => {
    const query = registrationSessionQuery.trim().toLowerCase();
    if (!query) return [];
    return sessionSearchResults
      .filter((session) => {
        const category = session.category.replace("_", " ");
        const dateLabel = new Date(session.startsAt).toLocaleDateString("en-US");
        return [session.title, category, dateLabel, session.startsAt].join(" ").toLowerCase().includes(query);
      })
      .slice(0, 10);
  }, [registrationSessionQuery, sessionSearchResults]);
  const filteredCustomers = useMemo(
    () => (registrationCustomerQuery.trim() ? filterCustomers(customers, registrationCustomerQuery).slice(0, 8) : []),
    [customers, registrationCustomerQuery]
  );
  const selectedRegistrationCustomer = registrationCustomerId
    ? customers.find((entry) => entry.id === registrationCustomerId) ?? null
    : null;
  const selectedRegistrationSession = registrationSessionId
    ? sessionSearchResults.find((entry) => entry.id === registrationSessionId) ?? null
    : null;
  const canRegister = Boolean(registrationSessionId && registrationCustomerId && activeStaff);

  return (
    <section className="space-y-4">
      <PageHeader title="Programs" description="Programs → Sessions → Registrations foundation for front-desk operations." />

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
      {warning ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

      <ProgramCatalog programs={programs} sessions={sessions} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Create and review sessions for class/camp programs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Program</span>
                <select aria-label="Program for new session" value={programId} onChange={(event) => setProgramId(event.target.value)} className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.title}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Capacity</span>
                <Input aria-label="Session capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Start</span>
                <Input aria-label="Session start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">End</span>
                <Input aria-label="Session end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
              </label>
            </div>
            <Button
              onClick={() => {
                const result = createSession({
                  programId,
                  startsAt,
                  endsAt,
                  capacity: Number(capacity)
                });
                if (result.ok) {
                  setFeedback(result.message);
                  setWarning("");
                  if (result.sessionId) setRegistrationSessionId(result.sessionId);
                } else {
                  setWarning(result.message);
                  setFeedback("");
                }
              }}
            >
              Create Session
            </Button>

            <div className="space-y-2">
              {sessionsWithProgram.map(({ session, program }) => (
                <article key={session.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{program?.title ?? "Unknown program"}</p>
                  <p className="text-muted-foreground">
                    {new Date(session.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} •{" "}
                    {new Date(session.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="text-muted-foreground">{session.enrolled}/{session.capacity} enrolled</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrations</CardTitle>
            <CardDescription>Create customer registrations quickly from the desk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1 text-sm">
              <SessionSearchCombobox
                label="Register session search"
                placeholder="Search by title, program, date, category, or location"
                query={registrationSessionQuery}
                onQueryChange={setRegistrationSessionQuery}
                sessions={filteredSessionResults}
                selectedSession={selectedRegistrationSession}
                onSelect={(sessionId) => {
                  setRegistrationSessionId(sessionId);
                  setRegistrationSessionQuery("");
                }}
                onClear={() => {
                  setRegistrationSessionId("");
                  setRegistrationSessionQuery("");
                }}
                emptyMessage="No sessions found"
              />
            </label>
            <div className="space-y-1">
              <CustomerSearchCombobox
                label="Register customer search"
                placeholder="Search by name, member ID, phone, or email"
                query={registrationCustomerQuery}
                onQueryChange={setRegistrationCustomerQuery}
                customers={filteredCustomers}
                onSelect={(customerId) => {
                  setRegistrationCustomerId(customerId);
                  setRegistrationCustomerQuery("");
                }}
                onAddCustomer={() => setShowAddCustomer(true)}
                emptyMessage="No customers found"
              />
              {selectedRegistrationCustomer ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/20 px-3 py-2 text-sm" aria-label="Selected registration customer">
                  <span>{selectedRegistrationCustomer.firstName} {selectedRegistrationCustomer.lastName} • {selectedRegistrationCustomer.memberId}</span>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      setRegistrationCustomerId(null);
                      setRegistrationCustomerQuery("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </div>
            <Button
              disabled={!canRegister}
              onClick={() => {
                if (!activeStaff) {
                  setWarning("Select staff PIN to continue.");
                  setFeedback("");
                  requestStaffSwitch("Staff PIN Required");
                  return;
                }
                if (!registrationCustomerId) {
                  setWarning("Select a customer to register.");
                  setFeedback("");
                  return;
                }
                const result = registerCustomerForSession({ customerId: registrationCustomerId, sessionId: registrationSessionId });
                if (result.ok) {
                  setFeedback(result.message);
                  setWarning("");
                  setRegistrationCustomerId(null);
                  setRegistrationCustomerQuery("");
                } else {
                  setWarning(result.message);
                  setFeedback("");
                }
              }}
            >
              Register
            </Button>

            <RegistrationList registrations={registrations} customers={customers} sessions={sessions} programs={programs} />
          </CardContent>
        </Card>
      </div>
      {showAddCustomer ? (
        <AddCustomerModal
          open
          onClose={() => setShowAddCustomer(false)}
          onCreate={(input) => {
            const result = addCustomer(input);
            if (result.ok && result.customerId) {
              setRegistrationCustomerId(result.customerId);
              setRegistrationCustomerQuery("");
              setFeedback(result.message);
              setWarning("");
            }
            return result;
          }}
          title="Add Customer"
        />
      ) : null}
    </section>
  );
}
