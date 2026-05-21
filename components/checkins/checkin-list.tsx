"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { CheckInRow } from "@/components/checkins/checkin-row";
import { useCustomerState } from "@/lib/state/customer-state";

export function CheckInList() {
  const {
    activeDateKey,
    isActiveDateToday,
    goToNextDay,
    goToPreviousDay,
    setToday,
    todayLogRecords,
    occupancyCount,
    totalCheckIns,
    checkedOutCount,
    searchCustomers,
    checkInCustomer,
    checkOutRecord
  } = useCustomerState();

  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [warning, setWarning] = useState<string>("");

  const results = useMemo(() => searchCustomers(query), [searchCustomers, query]);

  const handleSelect = (customerId: string) => {
    const result = checkInCustomer(customerId, "manual_search");
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setQuery("");
  };

  const handleCheckOut = (recordId: string) => {
    const result = checkOutRecord(recordId);
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
  };

  return (
    <section className="space-y-4">
      <header className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily Log</p>
            <h3 className="text-xl font-semibold">{isActiveDateToday ? "Today" : activeDateKey}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={goToPreviousDay} aria-label="Previous Day">Previous</Button>
            <Button variant="outline" onClick={setToday}>Today</Button>
            <Button variant="outline" onClick={goToNextDay} aria-label="Next Day">Next</Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <p data-testid="occupancy-count" className="rounded-md bg-secondary px-3 py-2 text-sm">{occupancyCount} currently in</p>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{totalCheckIns} total check-ins</p>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{checkedOutCount} checked out</p>
        </div>
      </header>

      {isActiveDateToday ? (
        <div className="w-full max-w-2xl">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Scan barcode, member ID, phone, email, or search name"
            label="Scan barcode, member ID, phone, email, or search name"
            autoFocus
            className="h-12 text-base"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Historical check-in logs are read-only.</p>
      )}

      {isActiveDateToday && query && results.length > 0 ? (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer.id)}
              className="flex min-h-11 w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-secondary"
              aria-label={`Check In ${customer.firstName} ${customer.lastName}`}
            >
              <span>
                <span className="block font-medium">{customer.firstName} {customer.lastName}</span>
                <span className="block text-sm text-muted-foreground">{customer.memberId} • {customer.phone}</span>
              </span>
              <span className="text-sm text-primary">Check In</span>
            </button>
          ))}
        </div>
      ) : null}

      {feedback ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div> : null}
      {warning ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</div> : null}

      {todayLogRecords.length === 0 ? (
        <EmptyState title="No check-ins for this day" description="The daily log is empty for this date." />
      ) : (
        <div className="space-y-2">
          {todayLogRecords.map((record) => (
            <CheckInRow
              key={record.id}
              record={record}
              readOnly={!isActiveDateToday}
              onCheckOut={handleCheckOut}
            />
          ))}
        </div>
      )}
    </section>
  );
}
