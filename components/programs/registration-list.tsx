"use client";

import type { Customer, Program, Registration, ClassCampSession } from "@/types/domain";

export function RegistrationList({
  registrations,
  customers,
  sessions,
  programs
}: {
  registrations: Registration[];
  customers: Customer[];
  sessions: ClassCampSession[];
  programs: Program[];
}) {
  return (
    <div className="space-y-2">
      {registrations.length === 0 ? <p className="text-sm text-muted-foreground">No registrations recorded yet.</p> : null}
      {registrations.slice(0, 12).map((registration) => {
        const customer = customers.find((entry) => entry.id === registration.customerId);
        const session = sessions.find((entry) => entry.id === registration.sessionId);
        const program = session ? programs.find((entry) => entry.id === session.programId) : undefined;
        return (
          <article key={registration.id} className="rounded-lg border p-3 text-sm">
            <p>{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"} • {program?.title ?? "Unknown program"}</p>
            <p className="text-muted-foreground">{registration.status}</p>
          </article>
        );
      })}
    </div>
  );
}

