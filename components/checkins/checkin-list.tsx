"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { CheckInRow } from "@/components/checkins/checkin-row";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

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
    customers,
    accessProducts,
    checkInCustomer,
    checkOutRecord,
    evaluateCustomerEntry,
    sellAccessProducts,
    addCustomer
  } = useCustomerState();
  const { activeStaff, assertPermission, requestStaffSwitch, hasPermission } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<"all" | "eligible" | "blocked" | "checked_in">("all");
  const [feedback, setFeedback] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [sellCustomerId, setSellCustomerId] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sellCustomer = useMemo(() => customers.find((entry) => entry.id === sellCustomerId) ?? null, [customers, sellCustomerId]);

  const queryResults = useMemo(() => searchCustomers(query), [searchCustomers, query]);
  const filteredResults = useMemo(() => {
    if (quickFilter === "all") return queryResults;
    if (quickFilter === "checked_in") return queryResults.filter((entry) => entry.checkInStatus === "in");
    if (quickFilter === "eligible") return queryResults.filter((entry) => evaluateCustomerEntry(entry.id).allowed);
    return queryResults.filter((entry) => !evaluateCustomerEntry(entry.id).allowed);
  }, [queryResults, quickFilter, evaluateCustomerEntry]);
  const highlighted = filteredResults[Math.min(highlightIndex, Math.max(filteredResults.length - 1, 0))];
  const selectedCustomer = customers.find((entry) => entry.id === selectedCustomerId);
  const selectedDecision = selectedCustomer ? evaluateCustomerEntry(selectedCustomer.id) : null;
  const activeRecord = selectedCustomer
    ? todayLogRecords.find((record) => record.customerId === selectedCustomer.id && record.status === "checked-in")
    : null;

  const checkInLabel = useMemo(() => {
    if (!selectedDecision) return "";
    if (selectedDecision.chosenAccess?.type === "membership") return "Using Monthly Membership";
    if (selectedDecision.chosenAccess?.type === "day-pass") return "Using Day Pass";
    if (selectedDecision.chosenAccess?.type === "punch-pass") {
      return `Using Punch Pass (${selectedDecision.chosenAccess.remainingPunches ?? 0} remaining)`;
    }
    if (selectedDecision.sessionAccess) return "Using Session Registration";
    return "Using available access";
  }, [selectedDecision]);

  const statusItems = selectedDecision
    ? [
        ...(selectedDecision.accessSummary.map((line) => ({ tone: line.toLowerCase().includes("missing") || line.toLowerCase().includes("expired") ? "denied" : line.toLowerCase().includes("remaining") ? "attention" : "approved", line }))),
        ...selectedDecision.reasons
          .filter((line) => !line.toLowerCase().includes("access approved"))
          .map((line) => ({ tone: "denied", line })),
        ...selectedDecision.warnings.map((line) => ({ tone: "attention", line }))
      ]
    : [];

  const runCheckIn = (customerId: string, overrideReason?: string) => {
    const permission = assertPermission("checkInCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const staffName = `${activeStaff!.firstName} ${activeStaff!.lastName}`;
    const result = checkInCustomer(customerId, {
      staffUserId: activeStaff!.id,
      staffName,
      source: "manual_search",
      overrideReason
    });
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      setShowSwitchPrompt(result.message.includes("no valid access method"));
      if (result.message.includes("no valid access method")) setSellCustomerId(customerId);
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
    setQuery("");
    setSelectedCustomerId("");
    setHighlightIndex(0);
    searchInputRef.current?.focus();
  };

  const handleSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setWarning("");
    setFeedback("");
  };

  const handleCheckOut = (recordId: string) => {
    const permission = assertPermission("checkOutCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const result = checkOutRecord(recordId, activeStaff!.id, `${activeStaff!.firstName} ${activeStaff!.lastName}`);
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
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
          <Link href="/check-in#recent-checkins" data-testid="occupancy-count" className="rounded-md bg-secondary px-3 py-2 text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="View current check-ins">
            Currently In: {occupancyCount}
          </Link>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{totalCheckIns} total check-ins</p>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{checkedOutCount} checked out</p>
        </div>
      </header>

      {isActiveDateToday ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <SearchInput
              label="Scan barcode, member ID, phone, email, or search name"
              showLabel
              placeholder="Scan barcode, member ID, phone, email, or search name"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setHighlightIndex(0);
              }}
              autoFocus
              inputRef={searchInputRef}
              className="h-12 text-base"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightIndex((prev) => Math.min(prev + 1, Math.max(filteredResults.length - 1, 0)));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightIndex((prev) => Math.max(prev - 1, 0));
                } else if (event.key === "Enter") {
                  if (highlighted) {
                    event.preventDefault();
                    handleSelect(highlighted.id);
                  }
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["eligible", "Eligible"],
                ["blocked", "Blocked"],
                ["checked_in", "Checked In"]
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={quickFilter === value ? "primary" : "secondary"}
                  className="h-9"
                  onClick={() => setQuickFilter(value as typeof quickFilter)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {query.trim().length === 0 ? (
              <EmptyState title="Start typing to find a customer" description="Search by name, member ID, phone, or email." />
            ) : filteredResults.length === 0 ? (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Customer not found</p>
                <Button variant="outline" className="min-h-11" onClick={() => setShowAddCustomer(true)}>Create Customer</Button>
              </div>
            ) : (
              <div className="space-y-2" role="listbox" aria-label="Customer search results">
                {filteredResults.map((customer, index) => {
                  const decision = evaluateCustomerEntry(customer.id);
                  const selected = selectedCustomerId === customer.id;
                  const highlightedRow = index === highlightIndex;
                  return (
                    <button
                      key={customer.id}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => handleSelect(customer.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${selected || highlightedRow ? "border-primary bg-secondary" : "hover:bg-secondary"}`}
                    >
                      <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                      <p className="text-sm text-muted-foreground">{customer.memberId} • {customer.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {decision.allowed ? "Eligible" : "Blocked"} • {decision.accessSummary[0] ?? decision.reasons[0] ?? "No details"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-4">
            {!selectedCustomer ? (
              <EmptyState title="No customer selected" description="Select a customer from search results to review access and check in." />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-secondary font-medium text-muted-foreground">
                    {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.memberId}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {statusItems.map((item, index) => (
                    <p key={`${item.line}-${index}`} className={`rounded-md px-2 py-1 text-sm ${item.tone === "approved" ? "bg-emerald-50 text-emerald-800" : item.tone === "attention" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
                      {item.tone === "approved" ? "\u2705" : item.tone === "attention" ? "\u26A0\uFE0F" : "\u274C"} {item.line}
                    </p>
                  ))}
                </div>
                {activeRecord ? (
                  <div className="space-y-2">
                    <Button className="w-full min-h-11" disabled>
                      Already Checked In
                    </Button>
                    <p className="text-sm text-muted-foreground">Checked in at {new Date(activeRecord.checkInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                ) : selectedDecision?.allowed ? (
                  <div className="space-y-2">
                    <Button className="w-full min-h-11" onClick={() => runCheckIn(selectedCustomer.id)}>
                      Check In
                    </Button>
                    <p className="text-sm text-muted-foreground">{checkInLabel}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button className="w-full min-h-11" disabled>
                      Cannot Check In
                    </Button>
                    <p className="text-sm text-muted-foreground">{selectedDecision?.reasons[0] ?? "No valid access."}</p>
                    {hasPermission("overrideAccess") ? (
                      <Button
                        variant="caution"
                        className="w-full min-h-11"
                        onClick={() => runCheckIn(selectedCustomer.id, "Manager override from check-in desk")}
                      >
                        Manager Override
                      </Button>
                    ) : null}
                    <Button variant="secondary" className="w-full min-h-11" onClick={() => setSellCustomerId(selectedCustomer.id)}>
                      Sell Access
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Historical check-in logs are read-only.</p>
      )}

      {feedback ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div> : null}
      {warning ? (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{warning}</p>
          {showSwitchPrompt ? (
            <div className="mt-2">
              <StaffSwitcher label="Switch Staff" title="Switch Staff PIN" />
            </div>
          ) : null}
          {warning.includes("no valid access method") && sellCustomerId ? (
            <div className="mt-2">
              <Button variant="secondary" onClick={() => setSellCustomerId(sellCustomerId)}>Sell Access</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {todayLogRecords.length === 0 ? (
        <EmptyState title="No check-ins for this day" description="The daily log is empty for this date." />
      ) : (
        <div id="recent-checkins" className="space-y-2">
          <p className="text-sm font-medium">Recent check-ins</p>
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
      {sellCustomer ? (
        <SellAccessModal
          open
          onClose={() => setSellCustomerId(null)}
          customer={sellCustomer}
          products={accessProducts}
          canUsePOS={hasPermission("usePOS")}
          canOverrideAccess={hasPermission("overrideAccess")}
          onSubmit={({ productIds, checkInAfterSale }) => {
            if (!activeStaff) {
              requestStaffSwitch("Staff PIN Required");
              return { ok: false, message: "Select staff PIN to continue.", transaction: null };
            }
            const result = sellAccessProducts({
              customerId: sellCustomer.id,
              productIds,
              soldByStaffId: activeStaff.id,
              soldByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
              checkInAfterSale
            });
            if (result.ok) {
              setFeedback(result.message);
              setWarning("");
              setShowSwitchPrompt(false);
            } else {
              setWarning(result.message);
            }
            return { ...result, transaction: result.transaction ?? null };
          }}
        />
      ) : null}
      {showAddCustomer ? (
        <AddCustomerModal
          open
          onClose={() => setShowAddCustomer(false)}
          customers={customers}
          onCreate={(input) => {
            const result = addCustomer({
              ...input,
              createdByStaffId: activeStaff?.id,
              createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
            });
            if (result.ok && result.customerId) {
              setQuery(`${input.firstName} ${input.lastName}`);
              setFeedback(result.message);
              setWarning("");
            }
            return result;
          }}
          title="New Customer"
          onCreated={(customerId, input) => {
            setQuery(`${input.firstName} ${input.lastName}`.trim());
            setSelectedCustomerId(customerId);
            setFeedback("Customer created.");
            setWarning("");
          }}
          quickActions={{
            onSellAccess: (customerId) => setSellCustomerId(customerId),
            onCheckIn: (customerId) => runCheckIn(customerId)
          }}
        />
      ) : null}
    </section>
  );
}
