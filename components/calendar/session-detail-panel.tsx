import { useMemo, useState } from "react";
import type { ClassCampSession, Customer, Program, Registration } from "@/types/domain";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Button } from "@/components/ui/button";
import { filterCustomers } from "@/lib/data/customer-search";

export function SessionDetailPanel({
  session,
  program,
  registrations,
  customers,
  onRegister,
  onCancelRegistration,
  onClose
}: {
  session: ClassCampSession;
  program?: Program;
  registrations: Registration[];
  customers: Customer[];
  onRegister: (customerId: string) => void;
  onCancelRegistration: (registrationId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filteredCustomers = useMemo(() => (query.trim() ? filterCustomers(customers, query).slice(0, 8) : []), [query, customers]);
  const sessionRegistrations = registrations.filter((entry) => entry.sessionId === session.id && entry.status !== "cancelled");

  return (
    <aside className="rounded-xl border bg-card p-4" aria-label="session-detail-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{session.title ?? program?.title ?? "Session"}</h3>
          <p className="text-sm text-muted-foreground">{program?.title ?? "Unknown Program"}</p>
          <p className="text-sm text-muted-foreground">{new Date(session.startsAt).toLocaleString("en-US")}</p>
          <p className="text-sm text-muted-foreground">Instructor: {session.instructorName ?? "Unassigned"}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      <div className="mt-3">
        <CustomerSearchCombobox
          label="Session customer search"
          placeholder="Search customer to register"
          query={query}
          onQueryChange={setQuery}
          customers={filteredCustomers}
          onSelect={(customerId) => {
            onRegister(customerId);
            setQuery("");
          }}
          emptyMessage="No customers found"
        />
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium">Registrations</p>
        {sessionRegistrations.length === 0 ? <p className="text-sm text-muted-foreground">No registrations yet.</p> : null}
        {sessionRegistrations.map((entry) => {
          const customer = customers.find((item) => item.id === entry.customerId);
          return (
            <article key={entry.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p>{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"}</p>
                <Button className="h-9" variant="outline" onClick={() => onCancelRegistration(entry.id)}>Cancel</Button>
              </div>
              <p className="text-xs text-muted-foreground">{entry.status}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border bg-secondary/20 p-3 text-xs text-muted-foreground">
        Notes: {session.notes?.trim() ? session.notes : "No notes yet."}
      </div>
    </aside>
  );
}
